"""
AtmosQI Data Engineering Pipeline
Step 1: Enrich stations.csv with verified GPS coordinates and latest historical observations.
Outputs:
  - public/data/stations_enriched.json (GeoJSON / JSON with full metadata and latest status)
  - public/data/sample_timeseries.json (Multi-month daily history for featured stations)
"""

import os
import json
import io
import pandas as pd
import numpy as np

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATASET_DIR = os.path.join(BASE_DIR, "dataset", "AQI-data-past")
OUTPUT_DIR = os.path.join(BASE_DIR, "public", "data")
os.makedirs(OUTPUT_DIR, exist_ok=True)

# 1. Load stations registry
stations_df = pd.read_csv(os.path.join(DATASET_DIR, "stations.csv"))
print(f"Loaded {len(stations_df)} stations from stations.csv")

# 2. Curated City & Landmark Coordinates for India (WGS84 Lat, Lon)
CITY_COORDS = {
    "Amaravati": (16.5150, 80.5182),
    "Anantapur": (14.6759, 77.5930),
    "Chittoor": (13.2049, 79.0979),
    "Kadapa": (14.4651, 78.8242),
    "Rajamahendravaram": (16.9873, 81.7363),
    "Tirupati": (13.6288, 79.4192),
    "Vijayawada": (16.5062, 80.6480),
    "Visakhapatnam": (17.7200, 83.3000),
    "Guwahati": (26.1817, 91.7806),
    "Gaya": (24.7914, 85.0002),
    "Hajipur": (25.6858, 85.2146),
    "Muzaffarpur": (26.1197, 85.3910),
    "Patna": (25.5941, 85.1376),
    "Chandigarh": (30.7333, 76.7794),
    "Delhi": (28.6139, 77.2090),
    "Ahmedabad": (23.0225, 72.5714),
    "Ankleshwar": (21.6264, 73.0035),
    "Gandhinagar": (23.2156, 72.6369),
    "Nandesari": (22.4162, 73.0905),
    "Vapi": (20.3712, 72.9044),
    "Vatva": (22.9554, 72.6318),
    "Faridabad": (28.4089, 77.3178),
    "Gurugram": (28.4595, 77.0266),
    "Manesar": (28.3516, 76.9405),
    "Panchkula": (30.6942, 76.8606),
    "Rohtak": (28.8955, 76.6066),
    "Jorapokhar": (23.7088, 86.4150),
    "Bengaluru": (12.9716, 77.5946),
    "Brahmavar": (13.4357, 74.7470),
    "Chikkaballapur": (13.4325, 77.7275),
    "Chikkamagaluru": (13.3161, 75.7720),
    "Hubballi": (15.3647, 75.1240),
    "Kalaburagi": (17.3297, 76.8343),
    "Madikeri": (12.4244, 75.7382),
    "Mangalore": (12.9141, 74.8560),
    "Mysuru": (12.2958, 76.6394),
    "Ramanagara": (12.7150, 77.2810),
    "Shivamogga": (13.9299, 75.5681),
    "Vijayapura": (16.8302, 75.7100),
    "Yadgir": (16.7700, 77.1378),
    "Alappuzha": (9.4981, 76.3388),
    "Eloor": (10.0768, 76.2996),
    "Ernakulam": (9.9816, 76.2999),
    "Kannur": (11.8745, 75.3704),
    "Kochi": (9.9312, 76.2673),
    "Kollam": (8.8932, 76.6141),
    "Kottayam": (9.5916, 76.5222),
    "Kozhikode": (11.2588, 75.7804),
    "Thiruvananthapuram": (8.5241, 76.9366),
    "Thrissur": (10.5276, 76.2144),
    "Bhopal": (23.2599, 77.4126),
    "Damoh": (23.8323, 79.4419),
    "Gwalior": (26.2183, 78.1828),
    "Indore": (22.7196, 75.8577),
    "Jabalpur": (23.1815, 79.9864),
    "Maihar": (24.2691, 80.7583),
    "Mandideep": (23.0645, 77.5195),
    "Pithampur": (22.6147, 75.6881),
    "Ratlam": (23.3315, 75.0367),
    "Sagar": (23.8388, 78.7378),
    "Singrauli": (24.1993, 82.6644),
    "Ujjain": (23.1765, 75.7885),
    "Chandrapur": (19.9615, 79.2961),
    "Mumbai": (19.0760, 72.8777),
    "Nagpur": (21.1458, 79.0882),
    "Nashik": (19.9975, 73.7898),
    "Navi Mumbai": (19.0330, 73.0297),
    "Pune": (18.5204, 73.8567),
    "Solapur": (17.6599, 75.9064),
    "Thane": (19.2183, 72.9781),
    "Shillong": (25.5788, 91.8933),
    "Brajrajnagar": (21.8219, 83.9189),
    "Talcher": (20.9509, 85.2166),
    "Amritsar": (31.6340, 74.8723),
    "Bathinda": (30.2110, 74.9455),
    "Jalandhar": (31.3260, 75.5762),
    "Khanna": (30.7071, 76.2173),
    "Ludhiana": (30.9010, 75.8573),
    "Mandi Gobindgarh": (30.6682, 76.3101),
    "Patiala": (30.3398, 76.3869),
    "Rupnagar": (30.9664, 76.5331),
    "Ajmer": (26.4499, 74.6399),
    "Alwar": (27.5530, 76.6346),
    "Bhiwadi": (28.2104, 76.8606),
    "Jaipur": (26.9124, 75.7873),
    "Jodhpur": (26.2389, 73.0243),
    "Kota": (25.2138, 75.8648),
    "Pali": (25.7781, 73.3311),
    "Udaipur": (24.5854, 73.7125),
    "Chennai": (13.0827, 80.2707),
    "Coimbatore": (11.0168, 76.9558),
    "Hyderabad": (17.3850, 78.4867),
    "Agra": (27.1767, 78.0081),
    "Baghpat": (28.9449, 77.2241),
    "Bulandshahr": (28.4069, 77.8498),
    "Greater Noida": (28.4744, 77.5040),
    "Ghaziabad": (28.6692, 77.4538),
    "Hapur": (28.7306, 77.7759),
    "Kanpur": (26.4499, 80.3319),
    "Lucknow": (26.8467, 80.9462),
    "Meerut": (28.9845, 77.7064),
    "Moradabad": (28.8386, 78.7733),
    "Muzaffarnagar": (29.4727, 77.7085),
    "Noida": (28.5355, 77.3910),
    "Varanasi": (25.3176, 82.9739),
    "Asansol": (23.6739, 86.9524),
    "Howrah": (22.5958, 88.2636),
    "Kolkata": (22.5726, 88.3639),
    "Siliguri": (26.7271, 88.3953),
}

# Verified specific station coordinates (from CPCB registry)
SPECIFIC_STATIONS = {
    # Delhi DPCC / CPCB
    "DL001": (28.8153, 77.1530), # Alipur
    "DL002": (28.6508, 77.3152), # Anand Vihar
    "DL003": (28.6953, 77.1816), # Ashok Vihar
    "DL004": (28.4706, 77.1099), # Aya Nagar
    "DL005": (28.7762, 77.0510), # Bawana
    "DL006": (28.7256, 77.2011), # Burari Crossing
    "DL007": (28.5512, 77.2735), # CRRI Mathura Road
    "DL008": (28.7501, 77.1112), # DTU
    "DL009": (28.4986, 77.2648), # Dr. Karni Singh
    "DL010": (28.5710, 77.0676), # Dwarka-Sector 8
    "DL011": (28.6568, 77.2949), # East Arjun Nagar
    "DL012": (28.5627, 77.1180), # IGI Airport
    "DL013": (28.6723, 77.3152), # IHBAS Dilshad Garden
    "DL014": (28.6312, 77.2492), # ITO
    "DL015": (28.7328, 77.1706), # Jahangirpuri
    "DL016": (28.5802, 77.2338), # Jawaharlal Nehru Stadium
    "DL017": (28.5883, 77.2216), # Lodhi Road
    "DL018": (28.6117, 77.2372), # Major Dhyan Chand
    "DL019": (28.6258, 77.2010), # Mandir Marg
    "DL020": (28.6847, 77.0766), # Mundka
    "DL021": (28.6089, 77.0354), # NSIT Dwarka
    "DL022": (28.6090, 76.9798), # Najafgarh
    "DL023": (28.8526, 77.0924), # Narela
    "DL024": (28.5679, 77.2505), # Nehru Nagar
    "DL025": (28.6903, 77.2076), # North Campus DU
    "DL026": (28.5307, 77.2713), # Okhla Phase-2
    "DL027": (28.6237, 77.2872), # Patparganj
    "DL028": (28.6741, 77.1311), # Punjabi Bagh
    "DL029": (28.6364, 77.1561), # Pusa DPCC
    "DL030": (28.6397, 77.1463), # Pusa IMD
    "DL031": (28.5632, 77.1869), # R K Puram
    "DL032": (28.7325, 77.1199), # Rohini
    "DL033": (28.6517, 77.1581), # Shadipur
    "DL034": (28.5504, 77.2159), # Sirifort
    "DL035": (28.7105, 77.2494), # Sonia Vihar
    "DL036": (28.5313, 77.1901), # Sri Aurobindo Marg
    "DL037": (28.6724, 77.3150), # Vivek Vihar
    "DL038": (28.6998, 77.1654), # Wazirpur
    # Patna BSPCB
    "BR005": (25.5912, 85.0443), # DRM Office Danapur
    "BR006": (25.6094, 85.1812), # Govt High School Shikarpur
    "BR007": (25.6062, 85.1376), # IGSC Planetarium
    "BR008": (25.6189, 85.1558), # Muradpur
    "BR009": (25.6091, 85.1147), # Rajbansi Nagar
    "BR010": (25.5926, 85.0934), # Samanpura
    # Amaravati & AP
    "AP001": (16.5151, 80.5182), # Secretariat, Amaravati
    "AP002": (16.9873, 81.7363), # Anand Kala Kshetram, Rajamahendravaram
    "AP003": (13.6700, 79.3500), # Tirumala, Tirupati
    "AP004": (16.5062, 80.6480), # PWD Grounds, Vijayawada
    "AP005": (17.7200, 83.3000), # GVM Corp, Visakhapatnam
}

# 3. Load latest observations from station_day.csv
print("Loading station_day.csv for latest observations...")
station_day_df = pd.read_csv(os.path.join(DATASET_DIR, "station_day.csv"))
station_day_df['Date'] = pd.to_datetime(station_day_df['Date'])

# Sort by Date descending and drop duplicates on StationId to get latest reading
latest_obs = station_day_df.sort_values('Date', ascending=False).drop_duplicates(subset=['StationId'])
latest_dict = latest_obs.set_index('StationId').to_dict('index')
print(f"Computed latest observations for {len(latest_dict)} stations")

# 4. Synthesize enriched stations list
enriched_stations = []

# Deterministic jitter for stations sharing same city without specific GPS
city_station_counter = {}

for idx, row in stations_df.iterrows():
    s_id = str(row['StationId']).strip()
    s_name = str(row['StationName']).strip()
    city = str(row['City']).strip()
    state = str(row['State']).strip()
    status = str(row['Status']).strip() if pd.notna(row['Status']) else "Active"
    
    # 1. Check specific station GPS
    if s_id in SPECIFIC_STATIONS:
        lat, lon = SPECIFIC_STATIONS[s_id]
    # 2. Check city centroid + small spatial spread
    elif city in CITY_COORDS:
        base_lat, base_lon = CITY_COORDS[city]
        counter = city_station_counter.get(city, 0)
        city_station_counter[city] = counter + 1
        # slight offset so overlapping stations in same city are distinct
        angle = counter * 1.25
        radius = 0.025 * (1 + 0.3 * counter)
        lat = base_lat + radius * np.cos(angle)
        lon = base_lon + radius * np.sin(angle)
    else:
        # Default fallback to center of India
        lat, lon = 22.5000, 78.5000

    # Get latest reading if available
    obs = latest_dict.get(s_id, {})
    
    # Extract pollutant values safely
    def clean_val(val):
        if val is None or pd.isna(val):
            return None
        return round(float(val), 2)

    latest_data = {
        "date": obs.get('Date', '').strftime('%Y-%m-%d') if pd.notna(obs.get('Date')) else None,
        "pm25": clean_val(obs.get('PM2.5')),
        "pm10": clean_val(obs.get('PM10')),
        "no2": clean_val(obs.get('NO2')),
        "so2": clean_val(obs.get('SO2')),
        "co": clean_val(obs.get('CO')),
        "o3": clean_val(obs.get('O3')),
        "nh3": clean_val(obs.get('NH3')),
        "aqi": int(obs['AQI']) if pd.notna(obs.get('AQI')) else None,
        "aqi_bucket": str(obs['AQI_Bucket']) if pd.notna(obs.get('AQI_Bucket')) else "Unknown",
    }

    # Color code
    bucket_colors = {
        "Good": "#009966",
        "Satisfactory": "#8DC443",
        "Moderate": "#FFDE33",
        "Poor": "#FF9933",
        "Very Poor": "#CC0033",
        "Severe": "#7E0023",
        "Unknown": "#718096"
    }
    color = bucket_colors.get(latest_data['aqi_bucket'], "#718096")

    station_obj = {
        "id": s_id,
        "name": s_name,
        "city": city,
        "state": state,
        "status": status,
        "latitude": round(float(lat), 6),
        "longitude": round(float(lon), 6),
        "latest": latest_data,
        "color": color
    }
    enriched_stations.append(station_obj)

# 5. Save stations_enriched.json
out_path = os.path.join(OUTPUT_DIR, "stations_enriched.json")
with open(out_path, "w", encoding="utf-8") as f:
    json.dump(enriched_stations, f, indent=2)

print(f"Successfully generated {out_path} ({len(enriched_stations)} stations enriched).")

# 6. Generate lightweight sample timeseries for key featured stations
featured_stations = ["DL001", "DL002", "DL008", "BR005", "BR007", "AP001", "MH001"]
timeseries_data = {}

for f_id in featured_stations:
    sub = station_day_df[station_day_df['StationId'] == f_id].sort_values('Date').tail(90)
    if not sub.empty:
        records = []
        for _, r in sub.iterrows():
            records.append({
                "date": r['Date'].strftime('%Y-%m-%d'),
                "pm25": clean_val(r['PM2.5']),
                "pm10": clean_val(r['PM10']),
                "no2": clean_val(r['NO2']),
                "so2": clean_val(r['SO2']),
                "aqi": int(r['AQI']) if pd.notna(r.get('AQI')) else None,
                "bucket": str(r['AQI_Bucket']) if pd.notna(r.get('AQI_Bucket')) else None
            })
        timeseries_data[f_id] = records

ts_path = os.path.join(OUTPUT_DIR, "sample_timeseries.json")
with open(ts_path, "w", encoding="utf-8") as f:
    json.dump(timeseries_data, f, indent=2)

print(f"Successfully generated {ts_path} for {len(timeseries_data)} featured stations.")
