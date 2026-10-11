import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
  ArrowUpRight, Building2, Check, Compass, Globe2, MapPin, Navigation,
  Phone, Plus, Search, Sparkles, Star, Target, Users, ExternalLink,
  X, Info, RefreshCw, Map as MapIcon, Database, AlertCircle, Clock,
  HelpCircle, ShieldCheck
} from 'lucide-react';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useLeads } from '../context/LeadContext';
import ScoreBadge from '../components/common/ScoreBadge';
import { mockDiscoveryLocations } from '../data/mockDiscovery';
import { searchOsmBusinesses } from '../services/osmDiscoveryService';
import '../styles/discovery.css';

// Popular search suggestion chips
const suggestions = [
  { label: 'Restaurants in Madurai', keyword: 'Restaurant', city: 'Madurai, Tamil Nadu' },
  { label: 'Hospitals in Chennai', keyword: 'Healthcare', city: 'Chennai, Tamil Nadu' },
  { label: 'Hotels in Coimbatore', keyword: 'Hotel', city: 'Coimbatore, Tamil Nadu' },
  { label: 'Colleges & Tech in Trichy', keyword: 'IT / Tech', city: 'Trichy, Tamil Nadu' },
  { label: 'IT Enterprises in Bengaluru', keyword: 'IT / Tech', city: 'Bengaluru, Karnataka' },
  { label: 'BioLabs in Hyderabad', keyword: 'Healthcare', city: 'Hyderabad, Telangana' }
];

const categoryList = ['All', 'Restaurant', 'Healthcare', 'Hotel', 'IT / Tech', 'Manufacturing'];
const scoreTiers = [
  { label: 'All Scores', min: 0 },
  { label: '75+ High', min: 75 },
  { label: '85+ Hot', min: 85 },
  { label: '90+ Elite', min: 90 }
];

// Vector divIcon for Real OpenStreetMap POI markers (Green / Emerald)
const createRealMarkerIcon = (isSelected) => {
  return L.divIcon({
    className: 'custom-leaflet-marker real-osm-marker',
    html: `
      <div class="leaflet-pin real-pin ${isSelected ? 'selected' : ''}">
        <div class="leaflet-pin-icon">
          <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
          </svg>
          <span class="leaflet-pin-osm-tag">OSM</span>
        </div>
        <div class="leaflet-pin-pulse"></div>
      </div>
    `,
    iconSize: [32, 38],
    iconAnchor: [16, 36],
    popupAnchor: [0, -32]
  });
};

// Vector divIcon for Mock / Sample markers (Orange)
const createBusinessMarkerIcon = (score, isSelected) => {
  return L.divIcon({
    className: 'custom-leaflet-marker',
    html: `
      <div class="leaflet-pin ${isSelected ? 'selected' : ''}">
        <div class="leaflet-pin-icon">
          <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
          </svg>
          <span class="leaflet-pin-score">${score}</span>
        </div>
        <div class="leaflet-pin-pulse"></div>
      </div>
    `,
    iconSize: [32, 38],
    iconAnchor: [16, 36],
    popupAnchor: [0, -32]
  });
};

// Custom anchor icon for city center
const createCityCenterIcon = (cityName) => {
  return L.divIcon({
    className: 'custom-city-center-marker',
    html: `
      <div class="city-center-pin">
        <div class="city-center-core"></div>
        <span class="city-center-label">${cityName} Center</span>
      </div>
    `,
    iconSize: [95, 26],
    iconAnchor: [47, 13]
  });
};

// Controller to smoothly pan & resize Leaflet map when selection changes
function MapViewController({ center, zoom, activePin }) {
  const map = useMap();

  useEffect(() => {
    if (activePin?.lat && activePin?.lng) {
      map.flyTo([activePin.lat, activePin.lng], Math.max(map.getZoom(), 15), {
        duration: 0.7
      });
    } else if (center) {
      map.flyTo(center, zoom || 13, {
        duration: 0.7
      });
    }
  }, [center, zoom, activePin, map]);

  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 120);
    const handleResize = () => {
      map.invalidateSize();
    };
    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, [map]);

  return null;
}

export default function Discovery() {
  const { leads, discoveryList, addFromDiscovery, addToast, isDatabaseConnected } = useLeads();
  
  // Data source mode: 'live_osm' (Real OpenStreetMap POIs) vs 'sample_mock' (Sample Demo Catalog)
  const [dataSourceMode, setDataSourceMode] = useState('live_osm');
  
  const [keyword, setKeyword] = useState('');
  const [selectedCity, setSelectedCity] = useState('Madurai, Tamil Nadu');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [minScore, setMinScore] = useState(0);
  const [radius, setRadius] = useState('15');
  const [activePin, setActivePin] = useState(null);
  const [detailModalBusiness, setDetailModalBusiness] = useState(null);
  
  // Real OpenStreetMap State
  const [realOsmBusinesses, setRealOsmBusinesses] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [osmSourceLabel, setOsmSourceLabel] = useState('OpenStreetMap Live');
  
  const abortControllerRef = useRef(null);

  // Metadata for the active city
  const currentCityMeta = useMemo(() => {
    return mockDiscoveryLocations.find(loc => loc.label === selectedCity) || mockDiscoveryLocations[0];
  }, [selectedCity]);

  // Center coordinates [lat, lng] for current city
  const mapCenter = useMemo(() => {
    return [currentCityMeta.lat, currentCityMeta.lng];
  }, [currentCityMeta]);

  // Execute real OpenStreetMap search
  const executeOsmSearch = async (overrideParams = {}) => {
    const targetCity = overrideParams.city || selectedCity;
    const targetCategory = overrideParams.category !== undefined ? overrideParams.category : selectedCategory;
    const targetKeyword = overrideParams.keyword !== undefined ? overrideParams.keyword : keyword;
    const targetRadius = overrideParams.radius || radius;

    // Abort previous in-flight request if any
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsSearching(true);
    setSearchError(null);

    try {
      const result = await searchOsmBusinesses({
        keyword: targetKeyword,
        category: targetCategory,
        city: targetCity,
        radiusKm: parseInt(targetRadius, 10) || 15,
        limit: 30,
        signal: controller.signal
      });

      setRealOsmBusinesses(result.businesses || []);
      setOsmSourceLabel(result.source || 'OpenStreetMap Live');
      
      const count = result.businesses?.length || 0;
      if (count > 0) {
        addToast(`Found ${count} real businesses in ${targetCity.split(',')[0]} via ${result.source}`, 'success', 3000);
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.error('OSM Search Error:', err);
      setSearchError(err.message || 'Failed to retrieve OpenStreetMap data. Please verify network access.');
      addToast(err.message || 'Error querying OpenStreetMap', 'error', 4500);
    } finally {
      setIsSearching(false);
    }
  };

  // Perform search on mount and when city or data source mode changes
  useEffect(() => {
    if (dataSourceMode === 'live_osm') {
      executeOsmSearch();
    }
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [selectedCity, dataSourceMode]);

  // Filtered businesses matching active source mode
  const activeBusinesses = useMemo(() => {
    if (dataSourceMode === 'live_osm') {
      // In live OSM mode, searchOsmBusinesses handles keyword, category, city & radius.
      // Score threshold is only applied if user filters minScore > 0 (which filters unscored)
      let list = realOsmBusinesses;
      if (minScore > 0) {
        list = list.filter(b => (b.aiPredictedScore || 0) >= minScore);
      }
      return list;
    }

    // In sample mock mode, use existing mock dataset
    const term = keyword.trim().toLowerCase();
    const cityName = selectedCity.split(',')[0].trim().toLowerCase();

    return discoveryList.filter((business) => {
      const matchesCity = business.location.toLowerCase().includes(cityName);
      const matchesCategory = selectedCategory === 'All' || business.category.toLowerCase().includes(selectedCategory.toLowerCase());
      const matchesScore = (business.aiPredictedScore || 0) >= minScore;
      const matchesKeyword = !term || `${business.name} ${business.category} ${business.recommendedService} ${business.opportunitySnippet}`.toLowerCase().includes(term);

      return matchesCity && matchesCategory && matchesScore && matchesKeyword;
    });
  }, [dataSourceMode, realOsmBusinesses, discoveryList, keyword, selectedCity, selectedCategory, minScore]);

  // Synchronize active pin with active list
  useEffect(() => {
    if (activeBusinesses.length > 0) {
      if (!activePin || !activeBusinesses.some(b => b.id === activePin.id)) {
        // Pick first item with valid coordinates
        const firstWithCoords = activeBusinesses.find(b => b.lat && b.lng) || activeBusinesses[0];
        setActivePin(firstWithCoords);
      }
    } else {
      setActivePin(null);
    }
  }, [activeBusinesses]);

  // Trigger search on button click
  const runSearch = () => {
    if (dataSourceMode === 'live_osm') {
      executeOsmSearch();
    } else {
      setIsSearching(true);
      window.setTimeout(() => {
        setIsSearching(false);
        addToast(`Found ${activeBusinesses.length} sample businesses in ${selectedCity.split(',')[0]}`, 'success');
      }, 250);
    }
  };

  const chooseSuggestion = (item) => {
    setKeyword(item.keyword);
    setSelectedCity(item.city);
    if (dataSourceMode === 'live_osm') {
      executeOsmSearch({ keyword: item.keyword, city: item.city });
    }
    addToast(`Searching for ${item.keyword} in ${item.city.split(',')[0]}`, 'info');
  };

  // Helper to verify if an item is already added to leads
  const isBusinessInLeads = (business) => {
    if (!business) return false;
    return leads.some(l => {
      if (business.sourceId && l.sourceId && business.sourceId === l.sourceId) return true;
      if (business.osmId && l.osmId && String(business.osmId) === String(l.osmId)) return true;
      return l.businessName.toLowerCase().trim() === (business.name || '').toLowerCase().trim();
    });
  };

  return (
    <div className="discovery-page">
      {/* Discovery Hero Section */}
      <section className="discovery-hero">
        <div className="discovery-hero-copy">
          <span className="discovery-eyebrow">
            <Sparkles size={14} /> AI LOCATION INTELLIGENCE
          </span>
          <h1>Find your next<br /><span>best customer.</span></h1>
          <p>
            Interactive OpenStreetMap business discovery powered by real spatial node coordinates, bounded regional queries, and commercial prospect mapping.
          </p>
          <div className="discovery-hero-stats">
            <div>
              <strong>
                {dataSourceMode === 'live_osm' ? realOsmBusinesses.length : discoveryList.length}
              </strong>
              <span>{dataSourceMode === 'live_osm' ? 'Live OSM records' : 'Sample prospects'}</span>
            </div>
            <div>
              <strong style={{ color: '#10B981' }}>
                <ShieldCheck size={16} /> OpenStreetMap
              </strong>
              <span>Direct POI Ingestion</span>
            </div>
            <div>
              <strong>6 Regional Hubs</strong>
              <span>Madurai, Chennai, Coimbatore & Trichy</span>
            </div>
          </div>
        </div>

        <div className="discovery-hero-art" aria-hidden="true">
          <div className="hero-orbit orbit-one" /><div className="hero-orbit orbit-two" />
          <div className="hero-map-card">
            <div className="hero-map-grid" />
            <svg viewBox="0 0 420 240" preserveAspectRatio="none">
              <path d="M-20 170 C80 110 135 210 230 125S350 45 445 90"/>
              <path d="M80 -10 C110 65 180 70 170 260"/>
              <path d="M255 -20 C215 55 310 125 435 210"/>
            </svg>
            <span className="hero-map-pin pin-a"><MapPin size={20} fill="currentColor" /></span>
            <span className="hero-map-pin pin-b"><MapPin size={20} fill="currentColor" /></span>
            <span className="hero-map-pin pin-c"><MapPin size={20} fill="currentColor" /></span>
            <div className="hero-floating-card">
              <span className="floating-icon"><Building2 size={16} /></span>
              <span>
                <b>Spatial Discovery</b>
                <small>{selectedCity.split(',')[0]} · {radius} km radius</small>
              </span>
              <span className="floating-score">OSM</span>
            </div>
          </div>
          <div className="hero-glow" />
        </div>
      </section>

      {/* Section Subheading & Status Notice */}
      <div className="discovery-section-heading">
        <div>
          <span className="section-kicker">EXPLORATION & INGESTION ENGINE</span>
          <h2>Business Discovery & Territorial Radar</h2>
          <p>Search commercial clusters and pipeline genuine businesses using OpenStreetMap geospatial coordinates.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {dataSourceMode === 'live_osm' ? (
            <span className="real-badge-tag" title="Querying genuine OpenStreetMap POI records">
              <span className="dot" /> Live OpenStreetMap Data
            </span>
          ) : (
            <span className="mock-data-note" title="Sample businesses for developer demo">
              <span /> Sample Mock Data
            </span>
          )}
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '6px 10px',
              borderRadius: '20px',
              backgroundColor: '#ECFDF5',
              border: '1px solid #A7F3D0',
              color: '#065F46',
              fontSize: '10px',
              fontWeight: 700
            }}
          >
            <MapIcon size={12} /> Leaflet Tile Engine
          </span>
        </div>
      </div>

      {/* Popular Suggestions Row */}
      <div className="suggestion-row">
        <span className="suggestion-label">Popular searches</span>
        {suggestions.map((item) => (
          <button
            className="suggestion-chip"
            key={item.label}
            onClick={() => chooseSuggestion(item)}
          >
            {item.label} <ArrowUpRight size={13} />
          </button>
        ))}
      </div>

      {/* Main Discovery Workspace */}
      <div className="discovery-workspace">
        {/* Left Results & Filter Column */}
        <section className="discovery-results-column">
          {/* Refine Search Panel */}
          <div className="search-panel">
            {/* Data Source Mode Segmented Control */}
            <div className="source-mode-toggle" role="radiogroup" aria-label="Discovery Data Source">
              <button
                type="button"
                className={`source-mode-btn ${dataSourceMode === 'live_osm' ? 'active real-active' : ''}`}
                onClick={() => setDataSourceMode('live_osm')}
              >
                <Compass size={14} style={{ color: '#10B981' }} />
                <span>Live OpenStreetMap</span>
              </button>
              <button
                type="button"
                className={`source-mode-btn ${dataSourceMode === 'sample_mock' ? 'active' : ''}`}
                onClick={() => setDataSourceMode('sample_mock')}
              >
                <Database size={14} style={{ color: '#FF7A00' }} />
                <span>Sample Mock Catalog</span>
              </button>
            </div>

            <div className="search-panel-heading">
              <div className="search-panel-icon"><Target size={18} /></div>
              <div>
                <h3>Target Market Filters</h3>
                <p>
                  {dataSourceMode === 'live_osm'
                    ? 'Search real commercial nodes within geographic radius'
                    : 'Configure industry, territory, and qualification thresholds'}
                </p>
              </div>
            </div>

            <label className="discovery-field-label" htmlFor="business-keyword">
              Business keyword, brand or service
            </label>
            <div className="discovery-input-wrap">
              <Search size={17} />
              <input
                id="business-keyword"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder={dataSourceMode === 'live_osm' ? "e.g. Restaurant, Hospital, Textiles, Hotel..." : "e.g. Manufacturing, clinic, sweets, robotics..."}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') runSearch();
                }}
              />
              {keyword && (
                <button
                  type="button"
                  onClick={() => setKeyword('')}
                  style={{ color: 'var(--color-slate-400)', background: 'transparent', border: 'none', cursor: 'pointer' }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* City & Radius Grid */}
            <div className="discovery-fields-grid" style={{ marginTop: '10px' }}>
              <div>
                <label className="discovery-field-label" htmlFor="target-city">Target City / Hub</label>
                <select
                  id="target-city"
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                >
                  {mockDiscoveryLocations.map((loc) => (
                    <option key={loc.label} value={loc.label}>{loc.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="discovery-field-label" htmlFor="search-radius">Geographic Radius</label>
                <select
                  id="search-radius"
                  value={radius}
                  onChange={(e) => setRadius(e.target.value)}
                >
                  <option value="5">Within 5 km</option>
                  <option value="15">Within 15 km (Recommended)</option>
                  <option value="25">Within 25 km</option>
                  <option value="40">Within 40 km</option>
                </select>
              </div>
            </div>

            {/* Category Filter Chips */}
            <div style={{ marginTop: '10px' }}>
              <label className="discovery-field-label">Industry Category</label>
              <div className="category-chip-row">
                {categoryList.map((cat) => (
                  <button
                    type="button"
                    key={cat}
                    className={`category-chip ${selectedCategory === cat ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedCategory(cat);
                      if (dataSourceMode === 'live_osm') {
                        executeOsmSearch({ category: cat });
                      }
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Minimum AI Score Threshold Filter (Relevant for mock data or qualified leads) */}
            {dataSourceMode === 'sample_mock' && (
              <div style={{ marginTop: '6px' }}>
                <label className="discovery-field-label">AI Score Threshold</label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {scoreTiers.map(tier => (
                    <button
                      type="button"
                      key={tier.label}
                      onClick={() => setMinScore(tier.min)}
                      style={{
                        flex: 1,
                        padding: '5px 8px',
                        borderRadius: '6px',
                        fontSize: '10px',
                        fontWeight: 600,
                        border: '1px solid',
                        borderColor: minScore === tier.min ? 'var(--color-primary)' : 'var(--color-slate-200)',
                        backgroundColor: minScore === tier.min ? 'var(--color-primary-light)' : '#FFFFFF',
                        color: minScore === tier.min ? 'var(--color-primary)' : 'var(--color-slate-600)',
                        cursor: 'pointer'
                      }}
                    >
                      {tier.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Submit Search Button */}
            <button
              className="discovery-submit"
              onClick={runSearch}
              disabled={isSearching}
              style={{
                background: dataSourceMode === 'live_osm'
                  ? 'linear-gradient(100deg, #059669, #10B981)'
                  : 'linear-gradient(100deg, #ef772d, #f49a45)'
              }}
            >
              <Search size={16} />
              {isSearching
                ? 'Querying OpenStreetMap...'
                : `Discover in ${selectedCity.split(',')[0]} (${dataSourceMode === 'live_osm' ? 'Live OSM' : 'Sample'})`}
            </button>

            <div className="privacy-caption">
              {dataSourceMode === 'live_osm' ? (
                <>
                  <ShieldCheck size={13} style={{ color: '#10B981' }} />
                  <span>Real OpenStreetMap nodes. No Google Maps scraping. Respects usage policy.</span>
                </>
              ) : (
                <>
                  <Sparkles size={13} />
                  <span>Sample mock businesses plotted on OpenStreetMap layer.</span>
                </>
              )}
            </div>
          </div>

          {/* Results Header */}
          <div className="results-heading">
            <div>
              <h3>
                Discovered Businesses <span>{activeBusinesses.length}</span>
              </h3>
              <p>
                {dataSourceMode === 'live_osm'
                  ? `Live records around ${selectedCity.split(',')[0]} via ${osmSourceLabel}`
                  : `Sample dataset in ${selectedCity.split(',')[0]} territory`}
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {dataSourceMode === 'live_osm' ? (
                <span className="real-badge-tag">
                  <span className="dot" /> Live OSM
                </span>
              ) : (
                <span className="mock-badge-tag">Sample Data</span>
              )}
            </div>
          </div>

          {/* Loading, Error, Empty & Business Results List */}
          <div className="business-list">
            {isSearching ? (
              <div className="discovery-loading-state">
                <div className="discovery-spinner" />
                <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-slate-800)', margin: '0 0 4px' }}>
                  Querying OpenStreetMap live data...
                </h4>
                <p style={{ fontSize: '11px', color: 'var(--color-slate-500)', margin: 0 }}>
                  Scanning commercial entities in {selectedCity.split(',')[0]} ({radius} km bounded radius).
                </p>
              </div>
            ) : searchError ? (
              <div className="discovery-error-state">
                <AlertCircle size={36} style={{ color: '#EF4444', marginBottom: '10px' }} />
                <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-slate-800)', marginBottom: '4px' }}>
                  Unable to load OpenStreetMap records
                </h4>
                <p style={{ fontSize: '11px', color: 'var(--color-slate-600)', marginBottom: '14px', maxWidth: '340px' }}>
                  {searchError}
                </p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className="btn btn-primary"
                    style={{ fontSize: '11px', padding: '6px 12px' }}
                    onClick={() => executeOsmSearch()}
                  >
                    <RefreshCw size={12} style={{ marginRight: '4px' }} /> Retry Search
                  </button>
                  <button
                    className="btn btn-secondary"
                    style={{ fontSize: '11px', padding: '6px 12px' }}
                    onClick={() => setDataSourceMode('sample_mock')}
                  >
                    Use Sample Catalog
                  </button>
                </div>
              </div>
            ) : activeBusinesses.length === 0 ? (
              <div className="discovery-empty-state">
                <Building2 size={36} style={{ color: 'var(--color-slate-300)', marginBottom: '10px' }} />
                <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-slate-800)', marginBottom: '4px' }}>
                  No businesses found in this territory
                </h4>
                <p style={{ fontSize: '11px', color: 'var(--color-slate-500)', marginBottom: '14px' }}>
                  {dataSourceMode === 'live_osm'
                    ? `No OpenStreetMap entities matched "${keyword || selectedCategory}" within ${radius} km of ${selectedCity.split(',')[0]}.`
                    : 'Try relaxing your keyword, category, or minimum score filter.'}
                </p>
                <button
                  className="btn btn-secondary"
                  style={{ fontSize: '11px', padding: '6px 12px' }}
                  onClick={() => {
                    setKeyword('');
                    setSelectedCategory('All');
                    setMinScore(0);
                    if (dataSourceMode === 'live_osm') {
                      executeOsmSearch({ keyword: '', category: 'All' });
                    }
                  }}
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              activeBusinesses.map((item) => {
                const isSelected = activePin?.id === item.id;
                const inLeads = isBusinessInLeads(item);

                return (
                  <article
                    className={`business-card ${isSelected ? 'selected' : ''}`}
                    key={item.id}
                    onClick={() => setActivePin(item)}
                  >
                    <div className="business-card-top">
                      <div
                        className="business-avatar"
                        style={item.isRealData ? { background: 'linear-gradient(135deg, #ECFDF5, #D1FAE5)', color: '#065F46' } : {}}
                      >
                        {item.name.split(' ').slice(0, 2).map((part) => part[0]).join('') || 'OSM'}
                      </div>
                      <div className="business-title">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <h4>{item.name}</h4>
                          {item.isRealData ? (
                            <span className="real-badge-tag">
                              <span className="dot" /> OpenStreetMap
                            </span>
                          ) : (
                            <span className="mock-badge-tag">Mock</span>
                          )}
                        </div>
                        <div className="business-meta">
                          <span>{item.category}</span>
                          <i />
                          {item.isRealData ? (
                            <span style={{ color: '#059669', fontWeight: 600 }}>
                              Verified Coordinates
                            </span>
                          ) : (
                            <span className="business-rating">
                              <Star size={12} fill="currentColor" /> {item.rating} <small>({item.reviewCount})</small>
                            </span>
                          )}
                        </div>
                      </div>
                      <ScoreBadge score={item.aiPredictedScore} size="sm" />
                    </div>

                    <div className="business-address">
                      <MapPin size={14} />
                      <span>{item.address}</span>
                      <span className="business-distance">
                        {item.distance || 'Regional node'}
                      </span>
                    </div>

                    {/* Display Real Contact Info if present in OSM */}
                    {item.isRealData && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px', fontSize: '10px', color: '#64748B', flexWrap: 'wrap' }}>
                        {item.phone ? (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#0F172A', fontWeight: 600 }}>
                            <Phone size={11} style={{ color: '#10B981' }} /> {item.phone}
                          </span>
                        ) : (
                          <span style={{ color: '#94A3B8' }}>Phone: Not listed on OSM</span>
                        )}

                        {item.website ? (
                          <a
                            href={item.website}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#0284C7', textDecoration: 'underline', fontWeight: 600 }}
                          >
                            <Globe2 size={11} /> Website <ExternalLink size={9} />
                          </a>
                        ) : (
                          <span style={{ color: '#94A3B8' }}>Website: Not listed on OSM</span>
                        )}

                        {item.openingHours && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#475569' }}>
                            <Clock size={11} /> {item.openingHours}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Opportunity / Strategic summary */}
                    <div className="business-opportunity">
                      <span>{item.isRealData ? 'OSM Record' : 'Opportunity'}</span>
                      <strong>
                        {item.isRealData ? (item.category || 'Commercial Entity') : (item.recommendedService || 'Tech Modernization')}
                      </strong>
                    </div>

                    <p style={{ fontSize: '11px', color: 'var(--color-slate-600)', margin: '8px 0 4px', lineHeight: 1.45 }}>
                      {item.opportunitySnippet}
                    </p>

                    <div className="business-actions">
                      <button
                        type="button"
                        className="text-action"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDetailModalBusiness(item);
                        }}
                      >
                        Full details & OSM tags <ArrowUpRight size={14} />
                      </button>

                      <button
                        type="button"
                        className={`add-lead-button ${inLeads ? 'added' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!inLeads) {
                            addFromDiscovery(item);
                          } else {
                            addToast(`"${item.name}" is already in active leads`, 'info');
                          }
                        }}
                      >
                        {inLeads ? (
                          <>
                            <Check size={14} /> Added to leads
                          </>
                        ) : (
                          <>
                            <Plus size={14} /> Add to leads
                          </>
                        )}
                      </button>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>

        {/* Right Map Panel: Real OpenStreetMap with Leaflet */}
        <section className="discovery-map-panel" aria-label="Interactive OpenStreetMap business discovery map">
          {/* Map Header */}
          <div className="map-topline">
            <div className="map-title">
              <span><Navigation size={16} /></span>
              <div>
                <b>{selectedCity.split(',')[0]} Territory</b>
                <small>{selectedCity.split(',')[1]?.trim()} · {radius} km radius</small>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setActivePin(null)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  color: '#CBD5E1',
                  fontSize: '10px',
                  fontWeight: 600,
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  cursor: 'pointer'
                }}
                title="Reset map view to city center"
              >
                <RefreshCw size={11} /> Reset Center
              </button>
            </div>
          </div>

          {/* OpenStreetMap Layer & Status Banner */}
          <div className="osm-status-banner">
            <div className="osm-status-badge">
              <span />
              <span>OpenStreetMap Live Raster Layer</span>
            </div>

            <span style={{ fontSize: '10px', color: '#94A3B8' }}>
              {dataSourceMode === 'live_osm' ? 'Plotting Genuine OSM Coordinates' : 'Standard Tile Engine'}
            </span>
          </div>

          {/* Interactive Leaflet Map Container */}
          <div className="leaflet-map-wrapper">
            <MapContainer
              center={mapCenter}
              zoom={currentCityMeta.zoom || 13}
              scrollWheelZoom={true}
              zoomControl={true}
              style={{ width: '100%', height: '100%' }}
            >
              {/* Standard OpenStreetMap Raster Tile Layer */}
              <TileLayer
                url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                maxZoom={19}
              />

              {/* Dynamic Map Controller for Smooth FlyTo & Auto Resize */}
              <MapViewController
                center={mapCenter}
                zoom={currentCityMeta.zoom || 13}
                activePin={activePin}
              />

              {/* Center Anchor Point Marker */}
              <Marker
                position={mapCenter}
                icon={createCityCenterIcon(selectedCity.split(',')[0])}
              />

              {/* Markers for Businesses with Valid Coordinates */}
              {activeBusinesses.map((business) => {
                // Safeguard against missing coordinates
                if (!business.lat || !business.lng || isNaN(business.lat) || isNaN(business.lng)) {
                  return null;
                }

                const isSelected = activePin?.id === business.id;
                const inLeads = isBusinessInLeads(business);

                const markerIcon = business.isRealData
                  ? createRealMarkerIcon(isSelected)
                  : createBusinessMarkerIcon(business.aiPredictedScore, isSelected);

                return (
                  <Marker
                    key={business.id}
                    position={[business.lat, business.lng]}
                    icon={markerIcon}
                    eventHandlers={{
                      click: () => setActivePin(business)
                    }}
                  >
                    <Popup autoPan={true}>
                      <div className="osm-popup-card">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '6px' }}>
                          {business.isRealData ? (
                            <span className="real-badge-tag">
                              <span className="dot" /> OSM POI
                            </span>
                          ) : (
                            <span style={{ fontSize: '9px', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', backgroundColor: '#FFF7ED', color: '#FF7A00' }}>
                              AI SCORE {business.aiPredictedScore}
                            </span>
                          )}

                          {business.isRealData ? (
                            <span style={{ fontSize: '9px', color: '#64748B', fontWeight: 600 }}>
                              ID: {business.osmId}
                            </span>
                          ) : (
                            <span className="mock-badge-tag">Sample Data</span>
                          )}
                        </div>

                        <h4>{business.name}</h4>

                        <div className="meta">
                          <span>{business.category}</span>
                          <span>•</span>
                          <span>{business.distance || `${selectedCity.split(',')[0]}`}</span>
                        </div>

                        <div style={{ fontSize: '10px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
                          <MapPin size={12} style={{ color: business.isRealData ? '#10B981' : '#FF7A00', flexShrink: 0 }} />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {business.address}
                          </span>
                        </div>

                        {business.isRealData && business.phone && (
                          <div style={{ fontSize: '10px', color: '#334155', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
                            <Phone size={11} style={{ color: '#10B981' }} />
                            <span>{business.phone}</span>
                          </div>
                        )}

                        <div className="osm-popup-actions">
                          <button
                            type="button"
                            className={`btn-add ${inLeads ? 'added' : ''}`}
                            onClick={() => {
                              if (!inLeads) {
                                addFromDiscovery(business);
                              } else {
                                addToast(`"${business.name}" is already in active leads`, 'info');
                              }
                            }}
                          >
                            {inLeads ? (
                              <>
                                <Check size={13} /> In Leads
                              </>
                            ) : (
                              <>
                                <Plus size={13} /> Add to Leads
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            className="btn-details"
                            onClick={() => setDetailModalBusiness(business)}
                          >
                            Details <ArrowUpRight size={12} />
                          </button>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          </div>

          {/* Map Footer */}
          <div className="map-footer">
            <div>
              <Users size={15} />
              <span>
                <b>{activeBusinesses.length} {dataSourceMode === 'live_osm' ? 'real OSM records' : 'sample prospects'}</b> mapped in {selectedCity.split(',')[0]}
              </span>
            </div>
            <span>
              {dataSourceMode === 'live_osm' ? 'OpenStreetMap Data • ODbL License' : 'OpenStreetMap Layer • Sample Mock Data'}
            </span>
          </div>
        </section>
      </div>

      {/* Full Business Details Modal */}
      {detailModalBusiness && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
            backdropFilter: 'blur(4px)'
          }}
          onClick={() => setDetailModalBusiness(null)}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              padding: '1.75rem',
              maxWidth: '560px',
              width: '100%',
              boxShadow: '0 24px 48px rgba(0,0,0,0.25)',
              position: 'relative',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: '12px',
                    background: detailModalBusiness.isRealData
                      ? 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)'
                      : 'linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%)',
                    color: detailModalBusiness.isRealData ? '#065F46' : 'var(--color-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '14px',
                    border: detailModalBusiness.isRealData ? '1px solid #A7F3D0' : '1px solid #FED7AA'
                  }}
                >
                  {detailModalBusiness.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-slate-900)' }}>
                      {detailModalBusiness.name}
                    </h3>
                    {detailModalBusiness.isRealData ? (
                      <span className="real-badge-tag">
                        <span className="dot" /> OpenStreetMap Live
                      </span>
                    ) : (
                      <span className="mock-badge-tag">Sample Data</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: 'var(--color-slate-500)', marginTop: '2px' }}>
                    <span>{detailModalBusiness.category}</span>
                    <span>•</span>
                    <span>{detailModalBusiness.location}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setDetailModalBusiness(null)}
                style={{ color: 'var(--color-slate-400)', background: 'transparent', border: 'none', padding: '4px', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Score & Opportunity Pill */}
            {detailModalBusiness.isRealData ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  marginBottom: '1.25rem'
                }}
              >
                <div>
                  <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Data Source Status
                  </span>
                  <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0F172A', marginTop: '2px' }}>
                    OpenStreetMap Verified Record
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '0.6875rem', color: '#64748B', fontWeight: 600 }}>AI Lead Score</span>
                  <div style={{ fontSize: '0.875rem', fontWeight: 800, color: '#64748B' }}>
                    Unscored • Pending AI Run
                  </div>
                </div>
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  backgroundColor: '#FFF7ED',
                  border: '1px solid #FFEDD5',
                  marginBottom: '1.25rem'
                }}
              >
                <div>
                  <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#C2410C', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Primary Tech Recommendation
                  </span>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: '#9A3412', marginTop: '2px' }}>
                    {detailModalBusiness.recommendedService}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '0.6875rem', color: '#9A3412', fontWeight: 600 }}>AI Predicted Score</span>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#EA580C', fontFamily: 'var(--font-family-display)' }}>
                    {detailModalBusiness.aiPredictedScore} / 100
                  </div>
                </div>
              </div>
            )}

            {/* Contact, Coordinates & Location Information */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', marginBottom: '1.25rem', fontSize: '0.8125rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-slate-700)' }}>
                <MapPin size={15} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
                <span>{detailModalBusiness.address}</span>
              </div>

              {detailModalBusiness.lat && detailModalBusiness.lng && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748B', fontSize: '0.75rem' }}>
                  <Navigation size={14} style={{ color: '#0284C7', flexShrink: 0 }} />
                  <span>
                    Coordinates: {detailModalBusiness.lat.toFixed(6)}, {detailModalBusiness.lng.toFixed(6)}
                  </span>
                  {detailModalBusiness.osmUrl && (
                    <a
                      href={detailModalBusiness.osmUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: '#0284C7', textDecoration: 'underline', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '2px' }}
                    >
                      View on OpenStreetMap <ExternalLink size={11} />
                    </a>
                  )}
                </div>
              )}

              {detailModalBusiness.phone ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-slate-700)' }}>
                  <Phone size={15} style={{ color: '#10B981', flexShrink: 0 }} />
                  <span>{detailModalBusiness.phone}</span>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94A3B8', fontSize: '0.75rem' }}>
                  <Phone size={15} style={{ color: '#CBD5E1', flexShrink: 0 }} />
                  <span>No phone number listed in OpenStreetMap records</span>
                </div>
              )}

              {detailModalBusiness.website ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Globe2 size={15} style={{ color: '#3B82F6', flexShrink: 0 }} />
                  <a
                    href={detailModalBusiness.website}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: 'var(--color-primary)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    {detailModalBusiness.website} <ExternalLink size={12} />
                  </a>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94A3B8', fontSize: '0.75rem' }}>
                  <Globe2 size={15} style={{ color: '#CBD5E1', flexShrink: 0 }} />
                  <span>No website URL listed in OpenStreetMap records</span>
                </div>
              )}

              {detailModalBusiness.openingHours && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#475569', fontSize: '0.75rem' }}>
                  <Clock size={15} style={{ color: '#64748B', flexShrink: 0 }} />
                  <span>Opening Hours: {detailModalBusiness.openingHours}</span>
                </div>
              )}
            </div>

            {/* AI Strategic Analysis Box or Real Data Qualification Notice */}
            {detailModalBusiness.isRealData ? (
              <div
                style={{
                  backgroundColor: '#F8FAFC',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  border: '1px solid #E2E8F0',
                  marginBottom: '1.5rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-slate-800)', marginBottom: '6px' }}>
                  <HelpCircle size={13} style={{ color: '#0284C7' }} />
                  <span>AI Lead Qualification Status</span>
                </div>
                <p style={{ fontSize: '0.8125rem', color: 'var(--color-slate-600)', lineHeight: 1.5, margin: 0 }}>
                  PRCBO LeadGen does not fabricate AI qualification scores or modernization opportunities for real businesses. This authentic OpenStreetMap record can be added to your local leads session and qualified in the upcoming automated AI pipeline.
                </p>
              </div>
            ) : (
              <div
                style={{
                  backgroundColor: 'var(--color-slate-50)',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  border: '1px solid var(--color-slate-200)',
                  marginBottom: '1.5rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-slate-800)', marginBottom: '6px' }}>
                  <Sparkles size={13} style={{ color: 'var(--color-primary)' }} />
                  <span>AI Intent & Strategic Modernization Analysis</span>
                </div>
                <p style={{ fontSize: '0.8125rem', color: 'var(--color-slate-600)', lineHeight: 1.5, margin: 0 }}>
                  {detailModalBusiness.opportunitySnippet}
                </p>
              </div>
            )}

            {/* Persistence Notice */}
            <div style={{ fontSize: '0.6875rem', color: isDatabaseConnected ? '#059669' : '#94A3B8', marginBottom: '1rem', textAlign: 'center' }}>
              {isDatabaseConnected
                ? '✅ Supabase PostgreSQL Connected: Added leads are immediately persisted to database.'
                : 'Note: Operating in local session mode. Configure Supabase in frontend/.env to persist leads.'}
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', paddingTop: '1rem', borderTop: '1px solid var(--color-slate-100)' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setDetailModalBusiness(null)}
                style={{ fontSize: '0.8125rem' }}
              >
                Close
              </button>

              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  const alreadyIn = isBusinessInLeads(detailModalBusiness);
                  if (!alreadyIn) {
                    addFromDiscovery(detailModalBusiness);
                  } else {
                    addToast(`"${detailModalBusiness.name}" is already in active leads`, 'info');
                  }
                }}
                style={{ fontSize: '0.8125rem' }}
              >
                {isBusinessInLeads(detailModalBusiness) ? (
                  <>
                    <Check size={14} /> In Leads
                  </>
                ) : (
                  <>
                    <Plus size={14} /> Add to Leads
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
