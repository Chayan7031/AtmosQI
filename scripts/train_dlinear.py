"""
AtmosQI Deep Learning Training Pipeline
Model: DLinear (Decomposition Linear) for 24-hour Multi-Horizon Environmental Forecasting
Reference: DEEP_LEARNING_SPECIFICATION.md & Zeng et al. (AAAI Best Paper)

Inputs: 48 past hours across 6 core pollutants (PM2.5, PM10, NO2, SO2, CO, O3)
Output: 24 future hours trajectory
Export: public/models/atmosqi_dlinear_24h.onnx + normalization_params.json
"""

import sys
import os
import json
import warnings

# Ensure UTF-8 output on Windows consoles
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

warnings.filterwarnings('ignore')

import torch
import torch.nn as nn
import pandas as pd
import numpy as np

# Set random seeds for reproducibility
torch.manual_seed(42)
np.random.seed(42)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATASET_PATH = os.path.join(BASE_DIR, "dataset", "AQI-data-past", "station_hour.csv")
MODELS_DIR = os.path.join(BASE_DIR, "public", "models")
os.makedirs(MODELS_DIR, exist_ok=True)

# 1. DLinear Architecture
class MovingAveragePool(nn.Module):
    """Moving average pool to extract trend-cyclical component"""
    def __init__(self, kernel_size=25, stride=1):
        super(MovingAveragePool, self).__init__()
        self.kernel_size = kernel_size
        self.avg = nn.AvgPool1d(kernel_size=kernel_size, stride=stride, padding=0)

    def forward(self, x):
        # x: [Batch, Length, Channels]
        # Pad front and back to maintain exact temporal length
        front = x[:, 0:1, :].repeat(1, (self.kernel_size - 1) // 2, 1)
        end = x[:, -1:, :].repeat(1, self.kernel_size // 2, 1)
        x_padded = torch.cat([front, x, end], dim=1)
        # Permute to [Batch, Channels, Length] for AvgPool1d
        x_padded = x_padded.permute(0, 2, 1)
        x_trend = self.avg(x_padded)
        x_trend = x_trend.permute(0, 2, 1)
        return x_trend

class SeriesDecomposition(nn.Module):
    def __init__(self, kernel_size=25):
        super(SeriesDecomposition, self).__init__()
        self.moving_avg = MovingAveragePool(kernel_size)

    def forward(self, x):
        trend = self.moving_avg(x)
        seasonal = x - trend
        return seasonal, trend

class DLinear(nn.Module):
    """
    DLinear: Linear Decomposition Network for Multi-Horizon Time Series
    L: Lookback window (48 hours)
    H: Forecast horizon (24 hours)
    C: Number of channels / pollutants (6)
    """
    def __init__(self, seq_len=48, pred_len=24, channels=6, kernel_size=25):
        super(DLinear, self).__init__()
        self.seq_len = seq_len
        self.pred_len = pred_len
        self.channels = channels
        
        self.decomposition = SeriesDecomposition(kernel_size)
        
        # Channel-independent temporal projection heads
        self.linear_seasonal = nn.Linear(self.seq_len, self.pred_len)
        self.linear_trend = nn.Linear(self.seq_len, self.pred_len)

    def forward(self, x):
        # x: [Batch, seq_len, channels]
        seasonal_init, trend_init = self.decomposition(x)
        
        # Permute to [Batch, channels, seq_len] to apply linear projection along time
        seasonal_init = seasonal_init.permute(0, 2, 1)
        trend_init = trend_init.permute(0, 2, 1)
        
        seasonal_output = self.linear_seasonal(seasonal_init)
        trend_output = self.linear_trend(trend_init)
        
        # Combine trend and seasonal components
        output = seasonal_output + trend_output
        # Permute back to [Batch, pred_len, channels]
        output = output.permute(0, 2, 1)
        return output

# 2. Data Loading & Robust Cleaning
POLLUTANTS = ['PM2.5', 'PM10', 'NO2', 'SO2', 'CO', 'O3']
REPRESENTATIVE_STATIONS = ['DL008', 'DL007', 'DL013', 'GJ001', 'KA003', 'MH005', 'TN001']

print("Loading hourly dataset for representative climate zones...")
all_chunks = []
usecols = ['StationId', 'Datetime'] + POLLUTANTS
dtypes = {'StationId': str, 'AQI_Bucket': str}

for chunk in pd.read_csv(DATASET_PATH, usecols=usecols, dtype=dtypes, chunksize=100000):
    sub = chunk[chunk['StationId'].isin(REPRESENTATIVE_STATIONS)]
    if not sub.empty:
        all_chunks.append(sub)

df = pd.concat(all_chunks, ignore_index=True)
print(f"Loaded {len(df)} hourly records across {len(REPRESENTATIVE_STATIONS)} stations.")

# Ensure numeric values and clip negative readings
for p in POLLUTANTS:
    df[p] = pd.to_numeric(df[p], errors='coerce').clip(lower=0)

# Compute global median fallbacks across all valid readings
global_medians = df[POLLUTANTS].median()
for p in POLLUTANTS:
    if pd.isna(global_medians[p]):
        global_medians[p] = 10.0

# Sort chronologically per station
df['Datetime'] = pd.to_datetime(df['Datetime'])
df = df.sort_values(by=['StationId', 'Datetime']).reset_index(drop=True)

# Interpolate missing values per station with global median fallback
clean_dfs = []
for s_id, group in df.groupby('StationId'):
    group = group.copy()
    group[POLLUTANTS] = group[POLLUTANTS].interpolate(method='linear', limit_direction='both')
    group[POLLUTANTS] = group[POLLUTANTS].fillna(global_medians)
    clean_dfs.append(group)

clean_df = pd.concat(clean_dfs, ignore_index=True)

# Calculate Normalization Parameters (Mean & Std)
means = clean_df[POLLUTANTS].mean().to_dict()
stds = clean_df[POLLUTANTS].std().replace(0, 1.0).to_dict()

# Save normalization parameters for JavaScript edge de-normalization
norm_params_path = os.path.join(MODELS_DIR, "normalization_params.json")
with open(norm_params_path, "w", encoding="utf-8") as f:
    json.dump({
        "pollutants": POLLUTANTS,
        "means": {k: round(float(v), 3) for k, v in means.items()},
        "stds": {k: round(float(v), 3) for k, v in stds.items()},
        "seq_len": 48,
        "pred_len": 24
    }, f, indent=2)
print(f"Saved normalization parameters to {norm_params_path}")

# Normalize features: (X - mean) / std
norm_data = (clean_df[POLLUTANTS] - pd.Series(means)) / pd.Series(stds)
clean_df[POLLUTANTS] = norm_data

# 3. Create Rolling Sequences (Lookback 48 -> Horizon 24)
SEQ_LEN = 48
PRED_LEN = 24
X_list, Y_list = [], []

for s_id, group in clean_df.groupby('StationId'):
    vals = group[POLLUTANTS].values
    n = len(vals)
    # Stride of 6 hours for efficient training sampling
    for i in range(0, n - SEQ_LEN - PRED_LEN, 6):
        X_list.append(vals[i : i + SEQ_LEN])
        Y_list.append(vals[i + SEQ_LEN : i + SEQ_LEN + PRED_LEN])

X_all = np.array(X_list, dtype=np.float32)
Y_all = np.array(Y_list, dtype=np.float32)

# Train/Test Split (85% Train, 15% Test)
split_idx = int(0.85 * len(X_all))
X_train, X_test = X_all[:split_idx], X_all[split_idx:]
Y_train, Y_test = Y_all[:split_idx], Y_all[split_idx:]

train_dataset = torch.utils.data.TensorDataset(torch.from_numpy(X_train), torch.from_numpy(Y_train))
test_dataset = torch.utils.data.TensorDataset(torch.from_numpy(X_test), torch.from_numpy(Y_test))

train_loader = torch.utils.data.DataLoader(train_dataset, batch_size=128, shuffle=True)
test_loader = torch.utils.data.DataLoader(test_dataset, batch_size=128, shuffle=False)

# 4. Model Training
model = DLinear(seq_len=SEQ_LEN, pred_len=PRED_LEN, channels=len(POLLUTANTS))
criterion = nn.SmoothL1Loss()
optimizer = torch.optim.AdamW(model.parameters(), lr=0.008, weight_decay=1e-4)
scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=10)

print(f"\n--- Training DLinear ({sum(p.numel() for p in model.parameters())} parameters) ---")
EPOCHS = 8

for epoch in range(1, EPOCHS + 1):
    model.train()
    total_loss = 0.0
    for bx, by in train_loader:
        optimizer.zero_grad()
        pred = model(bx)
        loss = criterion(pred, by)
        loss.backward()
        torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
        optimizer.step()
        total_loss += loss.item()
    
    scheduler.step()
    avg_train_loss = total_loss / len(train_loader)
    
    # Evaluate on test set
    model.eval()
    test_loss = 0.0
    with torch.no_grad():
        for tx, ty in test_loader:
            t_pred = model(tx)
            test_loss += criterion(t_pred, ty).item()
    avg_test_loss = test_loss / len(test_loader)
    
    print(f"Epoch {epoch:02d}/{EPOCHS:02d} | Train Loss: {avg_train_loss:.4f} | Test Loss: {avg_test_loss:.4f}")

# 5. Evaluate Final PM2.5 MAE
model.eval()
pm25_idx = POLLUTANTS.index('PM2.5')
pm25_std = stds['PM2.5']
all_preds, all_trues = [], []

with torch.no_grad():
    for tx, ty in test_loader:
        t_pred = model(tx)
        all_preds.append(t_pred[:, :, pm25_idx].numpy())
        all_trues.append(ty[:, :, pm25_idx].numpy())

preds_arr = np.concatenate(all_preds, axis=0) * pm25_std + means['PM2.5']
trues_arr = np.concatenate(all_trues, axis=0) * pm25_std + means['PM2.5']

preds_arr = np.clip(preds_arr, a_min=0, a_max=None)
trues_arr = np.clip(trues_arr, a_min=0, a_max=None)

mae = np.mean(np.abs(preds_arr - trues_arr))
rmse = np.sqrt(np.mean((preds_arr - trues_arr)**2))
print(f"\n=== Final Evaluation Metrics (PM2.5) ===")
print(f"Mean Absolute Error (MAE): {mae:.2f} ug/m3")
print(f"Root Mean Squared Error (RMSE): {rmse:.2f} ug/m3")

# 6. Export to ONNX (with legacy fallback to avoid dynamo character encoding issues)
onnx_export_path = os.path.join(MODELS_DIR, "atmosqi_dlinear_24h.onnx")
dummy_input = torch.randn(1, SEQ_LEN, len(POLLUTANTS), dtype=torch.float32)

try:
    torch.onnx.export(
        model,
        dummy_input,
        onnx_export_path,
        input_names=["past_48_hours"],
        output_names=["forecast_24_hours"],
        opset_version=17
    )
except Exception as e:
    print(f"Primary export notice ({e}), retrying with legacy fallback...")
    # Trace model
    traced = torch.jit.trace(model, dummy_input)
    torch.onnx.export(
        traced,
        dummy_input,
        onnx_export_path,
        input_names=["past_48_hours"],
        output_names=["forecast_24_hours"],
        opset_version=17
    )

model_size_kb = os.path.getsize(onnx_export_path) / 1024
print(f"\nSuccessfully exported ONNX model to: {onnx_export_path}")
print(f"Model file size: {model_size_kb:.1f} KB (Edge-optimized for browser loading!)")

# Also save PyTorch state dict as backup
weights_path = os.path.join(MODELS_DIR, "dlinear_weights.pth")
torch.save(model.state_dict(), weights_path)
print(f"Saved PyTorch weights to {weights_path}")
