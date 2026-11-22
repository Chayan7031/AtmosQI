import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  X,
  MapPin,
  Building2,
  Radio,
  Loader2,
  Navigation,
  Sparkles
} from 'lucide-react';
import { AQI_BUCKETS } from '../constants/aqiStandards';
import { searchUniversalLocations } from '../services/geoService';

export default function FilterBar({
  searchQuery,
  setSearchQuery,
  selectedState,
  setSelectedState,
  selectedBucket,
  setSelectedBucket,
  availableStates,
  filteredCount,
  totalCount,
  allStations = [],
  onSelectStation,
  onSelectUniversalPlace
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef(null);
  const debounceTimerRef = useRef(null);

  const buckets = [
    { key: 'ALL', label: 'All AQI', color: '#94A3B8' },
    { key: 'Good', label: 'Good', color: AQI_BUCKETS.GOOD.color },
    { key: 'Satisfactory', label: 'Satisfactory', color: AQI_BUCKETS.SATISFACTORY.color },
    { key: 'Moderate', label: 'Moderate', color: AQI_BUCKETS.MODERATE.color },
    { key: 'Poor', label: 'Poor', color: AQI_BUCKETS.POOR.color },
    { key: 'Very Poor', label: 'Very Poor', color: AQI_BUCKETS.VERY_POOR.color },
    { key: 'Severe', label: 'Severe', color: AQI_BUCKETS.SEVERE.color }
  ];

  // Live Geocoding Autocomplete (Google Maps-Style)
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!searchQuery || searchQuery.trim().length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const results = await searchUniversalLocations(searchQuery, allStations);
        setSuggestions(results);
        setIsOpen(results.length > 0);
        setHighlightedIndex(-1);
      } catch (err) {
        console.error("Geocoding search failed:", err);
      } finally {
        setIsSearching(false);
      }
    }, 280);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchQuery, allStations]);

  // Click outside listener to dismiss suggestions
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectSuggestion = (item) => {
    setIsOpen(false);
    setSearchQuery(item.title);

    if (item.type === 'station' && item.stationData) {
      if (onSelectStation) {
        onSelectStation(item.stationData);
      }
    } else {
      if (onSelectUniversalPlace) {
        onSelectUniversalPlace(item);
      }
    }
  };

  const handleKeyDown = (e) => {
    if (!isOpen || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
        handleSelectSuggestion(suggestions[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className="glass-panel"
      style={{
        position: 'absolute',
        top: 86,
        left: 16,
        zIndex: 990,
        padding: '12px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        maxWidth: 440,
        width: 'calc(100vw - 32px)'
      }}
    >
      {/* Search Input & State Selector */}
      <div style={{ display: 'flex', gap: 8, position: 'relative' }}>
        <div style={{
          position: 'relative',
          flex: 1,
          display: 'flex',
          alignItems: 'center'
        }}>
          <Search size={15} color="#06B6D4" style={{ position: 'absolute', left: 10 }} />
          <input
            type="text"
            placeholder="Search any Indian city, landmark, or station..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => {
              if (suggestions.length > 0) setIsOpen(true);
            }}
            onKeyDown={handleKeyDown}
            style={{
              width: '100%',
              padding: '9px 30px 9px 34px',
              borderRadius: 8,
              border: '1px solid rgba(255, 255, 255, 0.12)',
              background: 'rgba(0, 0, 0, 0.35)',
              color: '#F8FAFC',
              fontSize: 12,
              outline: 'none',
              fontFamily: 'inherit',
              transition: 'border-color 0.2s'
            }}
          />

          {isSearching && (
            <Loader2
              size={14}
              color="#06B6D4"
              className="animate-spin"
              style={{ position: 'absolute', right: 30 }}
            />
          )}

          {searchQuery && !isSearching && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSuggestions([]);
                setIsOpen(false);
              }}
              style={{
                position: 'absolute',
                right: 8,
                background: 'none',
                border: 'none',
                color: '#64748B',
                cursor: 'pointer',
                display: 'flex'
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* State Dropdown */}
        <select
          value={selectedState}
          onChange={(e) => setSelectedState(e.target.value)}
          style={{
            padding: '8px 12px',
            borderRadius: 8,
            border: '1px solid rgba(255, 255, 255, 0.1)',
            background: 'rgba(0, 0, 0, 0.4)',
            color: '#F8FAFC',
            fontSize: 12,
            outline: 'none',
            cursor: 'pointer',
            maxWidth: 130
          }}
        >
          <option value="ALL">All States</option>
          {availableStates.map(state => (
            <option key={state} value={state}>{state}</option>
          ))}
        </select>

        {/* Google Maps-Style Autocomplete Dropdown */}
        {isOpen && suggestions.length > 0 && (
          <div
            className="animate-fade-in"
            style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              left: 0,
              right: 0,
              background: 'rgba(10, 15, 26, 0.96)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: 12,
              boxShadow: '0 16px 40px rgba(0, 0, 0, 0.75), 0 0 16px rgba(6, 182, 212, 0.2)',
              zIndex: 2000,
              overflow: 'hidden',
              maxHeight: 320,
              overflowY: 'auto'
            }}
          >
            <div style={{
              padding: '6px 12px',
              fontSize: 10,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: '#06B6D4',
              borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}>
              <Sparkles size={11} /> Pan-India Location Results
            </div>

            {suggestions.map((item, idx) => {
              const isHighlighted = idx === highlightedIndex;
              const isStation = item.type === 'station';

              return (
                <div
                  key={item.id}
                  onClick={() => handleSelectSuggestion(item)}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  style={{
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    cursor: 'pointer',
                    background: isHighlighted ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
                    borderLeft: isHighlighted ? '3px solid #06B6D4' : '3px solid transparent',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {/* Category Icon */}
                  <div style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    backgroundColor: isStation ? 'rgba(16, 185, 129, 0.18)' : 'rgba(56, 189, 248, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: 2
                  }}>
                    {isStation ? (
                      <Radio size={14} color="#34D399" />
                    ) : item.type === 'city' ? (
                      <Building2 size={14} color="#38BDF8" />
                    ) : (
                      <MapPin size={14} color="#38BDF8" />
                    )}
                  </div>

                  {/* Title & Subtitle */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#F8FAFC' }}>
                        {item.title}
                      </span>
                      {isStation && (
                        <span style={{
                          fontSize: 9,
                          fontWeight: 700,
                          padding: '1px 5px',
                          borderRadius: 4,
                          backgroundColor: 'rgba(16, 185, 129, 0.2)',
                          color: '#34D399',
                          border: '1px solid rgba(16, 185, 129, 0.4)'
                        }}>
                          CPCB MONITOR
                        </span>
                      )}
                    </div>
                    <div style={{
                      fontSize: 11,
                      color: '#94A3B8',
                      marginTop: 2,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {item.subtitle}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* AQI Filter Pills */}
      <div style={{
        display: 'flex',
        gap: 6,
        overflowX: 'auto',
        paddingBottom: 2
      }}>
        {buckets.map(b => {
          const isActive = selectedBucket === b.key;
          return (
            <button
              key={b.key}
              onClick={() => setSelectedBucket(b.key)}
              style={{
                padding: '4px 10px',
                borderRadius: 20,
                fontSize: 11,
                fontWeight: 600,
                whiteSpace: 'nowrap',
                border: `1px solid ${isActive ? b.color : 'rgba(255, 255, 255, 0.08)'}`,
                background: isActive ? `${b.color}22` : 'rgba(0, 0, 0, 0.25)',
                color: isActive ? b.color : '#94A3B8',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              <span style={{
                display: 'inline-block',
                width: 6,
                height: 6,
                borderRadius: '50%',
                backgroundColor: b.color,
                marginRight: 5
              }} />
              {b.label}
            </button>
          );
        })}
      </div>

      {/* Station Count Counter */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: 11,
        color: '#64748B',
        paddingTop: 2,
        borderTop: '1px solid rgba(255, 255, 255, 0.05)'
      }}>
        <span>Coverage:</span>
        <strong style={{ color: '#06B6D4' }}>230 CPCB Monitors + All India Spatial Grid</strong>
      </div>
    </div>
  );
}
