const state = {
  riskFilter: "all",
  showBpbd: true,
  showRumahSakit: true,
  selectedSlug: null,
  detailDrawerOpen: false,
};

const riskLabels = {
  tinggi: "Prioritas Tinggi",
  sedang: "Prioritas Menengah",
  rendah: "Prioritas Rendah",
};

const riskColors = {
  tinggi: "#e74c3c",
  sedang: "#f4b942",
  rendah: "#2fbf71",
};

const facilitiesLabel = {
  bpbd: "BPBD",
  rumah_sakit: "Rumah Sakit",
};

const regionFeatures = [...window.JABODETABEK_DATA.features].sort(
  (left, right) => right.properties.floodIncidents2024 - left.properties.floodIncidents2024,
);
const facilityFeatures = window.SUPPORT_FACILITIES.features;

const detailPanel = document.querySelector("#detail-panel");
const priorityList = document.querySelector("#priority-list");
const regionList = document.querySelector("#region-list");
const statsGrid = document.querySelector("#stats-grid");
const riskFilter = document.querySelector("#risk-filter");
const regionSelect = document.querySelector("#region-select");
const toggleBpbd = document.querySelector("#toggle-bpbd");
const toggleRs = document.querySelector("#toggle-rs");
const resetViewButton = document.querySelector("#reset-view");
const detailDrawer = document.querySelector("#detail-drawer");
const detailToggle = document.querySelector("#detail-toggle");
const detailClose = document.querySelector("#detail-close");
const detailBackdrop = document.querySelector("#detail-backdrop");

const map = L.map("map", {
  zoomControl: false,
  preferCanvas: true,
  dragging: true,
  scrollWheelZoom: false,
  doubleClickZoom: true,
  boxZoom: false,
  keyboard: false,
  touchZoom: true,
  tap: true,
}).setView([-6.32, 106.92], 9);

const defaultViewBounds = L.latLngBounds(
  [-6.78, 106.45],
  [-6.02, 107.16],
);

map.setMaxBounds(defaultViewBounds.pad(0.04));
map.options.maxBoundsViscosity = 1;

L.control.zoom({ position: "bottomright" }).addTo(map);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 18,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);

const regionLayerGroup = L.layerGroup().addTo(map);
const facilityLayerGroup = L.layerGroup().addTo(map);
let regionLayer;

function getFilteredRegions() {
  if (state.riskFilter === "all") {
    return regionFeatures;
  }

  return regionFeatures.filter((feature) => feature.properties.category === state.riskFilter);
}

function getActiveFacilities() {
  return facilityFeatures.filter((feature) => {
    if (feature.properties.category === "bpbd" && !state.showBpbd) {
      return false;
    }

    if (feature.properties.category === "rumah_sakit" && !state.showRumahSakit) {
      return false;
    }

    return true;
  });
}

function formatCategoryChip(category) {
  return `<span class="risk-chip" style="background:${riskColors[category]}22;color:#fff;border:1px solid ${riskColors[category]}55">${riskLabels[category]}</span>`;
}

function formatSignedValue(value, suffix = "") {
  const rounded = Number(value.toFixed(1));
  return `${rounded > 0 ? "+" : ""}${rounded}${suffix}`;
}

function getRegionStyle(feature) {
  const color = riskColors[feature.properties.category] ?? "#8b95a7";
  const isSelected = feature.properties.slug === state.selectedSlug;

  return {
    color: isSelected ? "#ffffff" : "#19314c",
    weight: isSelected ? 3.2 : 1.6,
    fillColor: color,
    fillOpacity: isSelected ? 0.72 : 0.48,
    dashArray: isSelected ? "0" : "4 4",
  };
}

function setDetailDrawerOpen(nextValue) {
  state.detailDrawerOpen = nextValue;
  detailDrawer.classList.toggle("is-open", nextValue);
  detailBackdrop.classList.toggle("is-open", nextValue);
  detailDrawer.setAttribute("aria-hidden", String(!nextValue));
  detailToggle.setAttribute("aria-expanded", String(nextValue));
}

function toggleDetailDrawer() {
  setDetailDrawerOpen(!state.detailDrawerOpen);
}

function updateRegionLayer() {
  regionLayerGroup.clearLayers();
  const filteredRegions = getFilteredRegions();

  regionLayer = L.geoJSON(
    { type: "FeatureCollection", features: filteredRegions },
    {
      style: getRegionStyle,
      onEachFeature(feature, layer) {
        layer.on("mouseover", () => {
          if (feature.properties.slug !== state.selectedSlug) {
            layer.setStyle({ weight: 2.5, fillOpacity: 0.76, dashArray: "0" });
          }
        });

        layer.on("mouseout", () => {
          if (feature.properties.slug !== state.selectedSlug) {
            layer.setStyle(getRegionStyle(feature));
          }
        });

        layer.on("click", () => {
          focusRegion(feature.properties.slug, true);
        });
      },
    },
  );

  regionLayer.addTo(regionLayerGroup);

  if (!filteredRegions.some((feature) => feature.properties.slug === state.selectedSlug)) {
    state.selectedSlug = filteredRegions[0]?.properties.slug ?? null;
  }

  const selectedLayer = findRegionLayer(state.selectedSlug);
  if (selectedLayer) {
    selectedLayer.setStyle(getRegionStyle(selectedLayer.feature));
  }
}

function createFacilityMarker(feature, latlng) {
  const className = feature.properties.category === "rumah_sakit" ? "rumah-sakit" : "posko";
  const marker = L.marker(latlng, {
    icon: L.divIcon({
      className: "facility-icon",
      html: `<span class="marker-dot ${className}"></span>`,
      iconSize: [18, 18],
      iconAnchor: [9, 9],
      popupAnchor: [0, -10],
    }),
  });

  marker.bindPopup(`
    <div class="popup-content">
      <h3>${feature.properties.name}</h3>
      <p><strong>Tipe:</strong> ${facilitiesLabel[feature.properties.category]}</p>
      <p><strong>Wilayah:</strong> ${feature.properties.region}</p>
      <p><strong>Fungsi:</strong> ${feature.properties.service}</p>
      <p><strong>Sumber:</strong> ${feature.properties.source}</p>
    </div>
  `);

  return marker;
}

function updateFacilityLayer() {
  facilityLayerGroup.clearLayers();
  const filteredFacilities = getActiveFacilities();

  L.geoJSON(
    { type: "FeatureCollection", features: filteredFacilities },
    {
      pointToLayer: createFacilityMarker,
    },
  ).addTo(facilityLayerGroup);
}

function findRegionFeature(slug) {
  return regionFeatures.find((feature) => feature.properties.slug === slug) ?? null;
}

function findRegionLayer(slug) {
  let match = null;

  regionLayer?.eachLayer((layer) => {
    if (layer.feature.properties.slug === slug) {
      match = layer;
    }
  });

  return match;
}

function getRiskPriority(category) {
  if (category === "tinggi") {
    return "Prioritas mitigasi tinggi";
  }

  if (category === "sedang") {
    return "Prioritas mitigasi menengah";
  }

  return "Prioritas pemantauan";
}

function getRegionRank(slug) {
  return regionFeatures.findIndex((feature) => feature.properties.slug === slug) + 1;
}

function getFacilityCountsForRegion(regionName) {
  return getActiveFacilities().reduce(
    (counts, feature) => {
      const isSameRegion = feature.properties.region === regionName;
      const isDkiShared = feature.properties.region === "DKI Jakarta" && regionName.startsWith("Kota Jakarta");

      if (!isSameRegion && !isDkiShared) {
        return counts;
      }

      if (feature.properties.category === "bpbd") {
        counts.bpbd += 1;
      }

      if (feature.properties.category === "rumah_sakit") {
        counts.rumahSakit += 1;
      }

      counts.total += 1;
      return counts;
    },
    { bpbd: 0, rumahSakit: 0, total: 0 },
  );
}

function getMitigationRecommendations(feature, facilityCounts) {
  const props = feature.properties;
  const recommendations = [];

  if (props.floodIncidents2024 > 8) {
    recommendations.push("Wilayah ini sebaiknya masuk prioritas tinggi penanganan banjir tahunan karena jumlah kejadian 2024 berada pada kelas tertinggi Jabodetabek.");
  } else if (props.floodIncidents2024 >= 5) {
    recommendations.push("Mitigasi perlu difokuskan pada pengurangan kejadian berulang agar wilayah tidak bergeser ke kelas prioritas tinggi.");
  } else {
    recommendations.push("Wilayah ini relatif lebih rendah pada 2024, tetapi pemantauan tetap perlu dilakukan agar kejadian tidak meningkat pada musim hujan berikutnya.");
  }

  if (props.dominantHazard2024 === "Banjir") {
    recommendations.push("Karena banjir merupakan bahaya dominan wilayah ini pada 2024, upaya struktural dan kesiapsiagaan masyarakat perlu diprioritaskan secara spesifik untuk banjir.");
  } else {
    recommendations.push(`Banjir bukan bahaya dominan tunggal wilayah ini karena ${props.dominantHazard2024.toLowerCase()} juga cukup menonjol, sehingga mitigasi perlu dipadukan lintas jenis bencana.`);
  }

  if (facilityCounts.bpbd === 0) {
    recommendations.push("Belum ada titik BPBD yang tampil pada filter aktif wilayah ini, sehingga koordinasi kelembagaan perlu dipastikan melalui titik rujukan terdekat.");
  }

  if (facilityCounts.rumahSakit === 0) {
    recommendations.push("Tidak ada rumah sakit yang tampil pada filter aktif wilayah ini, sehingga jalur rujukan medis perlu diperjelas saat presentasi atau analisis lanjutan.");
  }

  if (props.trend24vs23 > 0) {
    recommendations.push("Total kejadian bencana 2024 meningkat dibanding 2023, sehingga evaluasi kesiapan wilayah perlu mempertimbangkan tekanan multi-bencana yang sedang naik.");
  }

  return recommendations.slice(0, 3);
}

function buildRiskNarrative(feature, averageFloodIncidents, averageFloodShare, eventShare) {
  const props = feature.properties;
  const incidentRelation = props.floodIncidents2024 >= averageFloodIncidents ? "di atas" : "di bawah";
  const shareRelation = props.floodShare2024 >= averageFloodShare ? "lebih besar" : "lebih kecil";

  return `${props.name} masuk kelas ${riskLabels[props.category].toLowerCase()} karena BNPB mencatat ${props.floodIncidents2024} kejadian banjir pada 2024. Nilai ini ${incidentRelation} rata-rata wilayah aktif, dengan kontribusi ${eventShare}% dari total kejadian banjir Jabodetabek yang sedang ditampilkan. Banjir menyumbang ${props.floodShare2024}% dari total seluruh bencana wilayah ini pada 2024, sehingga proporsi ancaman banjir ${shareRelation} dibanding rerata wilayah aktif. Bahaya dominan wilayah pada 2024 adalah ${props.dominantHazard2024.toLowerCase()} dengan ${props.dominantHazardCount2024} kejadian.`;
}

function updateStats() {
  const filteredRegions = getFilteredRegions();
  const activeFacilities = getActiveFacilities();
  const highRiskCount = filteredRegions.filter((feature) => feature.properties.category === "tinggi").length;
  const mediumRiskCount = filteredRegions.filter((feature) => feature.properties.category === "sedang").length;
  const totalFloodIncidents = filteredRegions.reduce((total, feature) => total + feature.properties.floodIncidents2024, 0);
  const avgFloodIncidents = filteredRegions.length
    ? (totalFloodIncidents / filteredRegions.length).toFixed(1)
    : "0.0";

  const stats = [
    { label: "Wilayah aktif", value: filteredRegions.length },
    { label: "Prioritas tinggi", value: highRiskCount },
    { label: "Prioritas menengah", value: mediumRiskCount },
    { label: "Total kejadian", value: totalFloodIncidents },
    { label: "Fasilitas aktif", value: activeFacilities.length },
    { label: "Rata-rata kejadian", value: avgFloodIncidents },
  ];

  statsGrid.innerHTML = stats
    .map(
      (item) => `
        <article class="stat-card">
          <span>${item.label}</span>
          <strong>${item.value}</strong>
        </article>
      `,
    )
    .join("");
}

function updatePriorityList() {
  const filteredRegions = getFilteredRegions();
  const topRegions = filteredRegions.slice(0, 3);

  if (!topRegions.length) {
    priorityList.innerHTML = '<div class="detail-empty">Tidak ada wilayah pada filter aktif.</div>';
    return;
  }

  priorityList.innerHTML = topRegions
    .map((feature, index) => {
      const props = feature.properties;
      return `
        <button class="priority-item" type="button" data-slug="${props.slug}">
          <span class="priority-rank">#${index + 1}</span>
          <div>
            <strong>${props.name}</strong>
            <p>${props.floodIncidents2024} kejadian banjir | ${props.floodShare2024}% dari total bencana 2024 | ${riskLabels[props.category]}</p>
          </div>
        </button>
      `;
    })
    .join("");

  priorityList.querySelectorAll(".priority-item").forEach((button) => {
    button.addEventListener("click", () => {
      focusRegion(button.dataset.slug, true);
    });
  });
}

function updateRegionSelect() {
  const filteredRegions = getFilteredRegions();
  const options = filteredRegions
    .map((feature) => {
      const { slug, name } = feature.properties;
      const selected = slug === state.selectedSlug ? "selected" : "";
      return `<option value="${slug}" ${selected}>${name}</option>`;
    })
    .join("");

  regionSelect.innerHTML = `<option value="">Pilih wilayah</option>${options}`;
}

function updateRegionList() {
  const filteredRegions = getFilteredRegions();

  regionList.innerHTML = filteredRegions
    .map((feature) => {
      const props = feature.properties;
      const activeClass = props.slug === state.selectedSlug ? "is-active" : "";

      return `
        <button class="region-item ${activeClass}" type="button" data-slug="${props.slug}">
          <h3>${props.name}</h3>
          <p>${props.floodIncidents2024} kejadian banjir | ${props.floodShare2024}% dari total bencana 2024 | ${riskLabels[props.category]}</p>
        </button>
      `;
    })
    .join("");

  regionList.querySelectorAll(".region-item").forEach((button) => {
    button.addEventListener("click", () => {
      focusRegion(button.dataset.slug, true);
    });
  });
}

function updateDetailPanel() {
  const feature = findRegionFeature(state.selectedSlug);

  if (!feature) {
    detailPanel.innerHTML = `
      <div class="detail-empty">
        Tidak ada wilayah yang cocok dengan filter aktif.
      </div>
    `;
    return;
  }

  const props = feature.properties;
  const filteredRegions = getFilteredRegions();
  const totalFloodIncidents = filteredRegions.reduce((total, item) => total + item.properties.floodIncidents2024, 0);
  const averageFloodIncidents = filteredRegions.length
    ? filteredRegions.reduce((total, item) => total + item.properties.floodIncidents2024, 0) / filteredRegions.length
    : 0;
  const averageFloodShare = filteredRegions.length
    ? filteredRegions.reduce((total, item) => total + item.properties.floodShare2024, 0) / filteredRegions.length
    : 0;
  const incidentPercent = Math.min(100, Math.round((props.floodIncidents2024 / 18) * 100));
  const priorityLabel = getRiskPriority(props.category);
  const regionRank = getRegionRank(props.slug);
  const eventShare = totalFloodIncidents ? ((props.floodIncidents2024 / totalFloodIncidents) * 100).toFixed(1) : "0.0";
  const incidentDelta = props.floodIncidents2024 - averageFloodIncidents;
  const floodShareDelta = props.floodShare2024 - averageFloodShare;
  const facilityCounts = getFacilityCountsForRegion(props.name);
  const recommendations = getMitigationRecommendations(feature, facilityCounts);
  const interpretationText = buildRiskNarrative(feature, averageFloodIncidents, averageFloodShare, eventShare);
  const visibleFacilities = getActiveFacilities().filter((item) => item.properties.region === props.name || (item.properties.region === "DKI Jakarta" && props.name.startsWith("Kota Jakarta")));
  const facilityItems = visibleFacilities.length
    ? visibleFacilities
        .map(
          (item) => `
            <div class="detail-list-item">
              <strong>${item.properties.name}</strong>
              <span>${facilitiesLabel[item.properties.category]} | ${item.properties.service}</span>
            </div>
          `,
        )
        .join("")
    : '<div class="detail-list-item"><strong>Belum ada fasilitas aktif</strong><span>Aktifkan layer BPBD atau rumah sakit untuk melihat dukungan wilayah ini.</span></div>';

  detailPanel.innerHTML = `
    <article class="detail-card">
      <div class="detail-overview">
        <div class="detail-hero">
          <div class="detail-hero-top">
            <div>
              <h3>${props.name}</h3>
              <p class="detail-copy detail-supporting">Peringkat #${regionRank} dari ${regionFeatures.length} wilayah | Kode wilayah ${props.code}</p>
            </div>
            ${formatCategoryChip(props.category)}
          </div>

          <div class="score-band">
            <div class="score-band-label">
              <span>Kejadian banjir BNPB 2024</span>
              <strong>${props.floodIncidents2024} kejadian</strong>
            </div>
            <div class="score-band-track">
              <div class="score-band-fill" style="width:${incidentPercent}%;background:${riskColors[props.category]};"></div>
            </div>
          </div>

          <div class="detail-callout">
            <strong>${priorityLabel}</strong>
            <span>${props.method}</span>
          </div>
        </div>

        <div class="detail-grid">
          <div class="mini-metric">
            <span>Kejadian banjir 2024</span>
            <strong>${props.floodIncidents2024}</strong>
          </div>
          <div class="mini-metric">
            <span>Total bencana 2024</span>
            <strong>${props.allDisasters2024}</strong>
          </div>
          <div class="mini-metric">
            <span>Proporsi banjir</span>
            <strong>${props.floodShare2024}%</strong>
          </div>
          <div class="mini-metric">
            <span>Total 2022-2024</span>
            <strong>${props.allDisasters3YearTotal}</strong>
          </div>
          <div class="mini-metric">
            <span>Banjir vs rata-rata</span>
            <strong>${formatSignedValue(incidentDelta)}</strong>
          </div>
          <div class="mini-metric">
            <span>Proporsi vs rata-rata</span>
            <strong>${formatSignedValue(floodShareDelta, "%")}</strong>
          </div>
          <div class="mini-metric">
            <span>Kontribusi ke tampilan</span>
            <strong>${eventShare}%</strong>
          </div>
          <div class="mini-metric">
            <span>BPBD / RS aktif</span>
            <strong>${facilityCounts.bpbd} / ${facilityCounts.rumahSakit}</strong>
          </div>
        </div>

        <div class="detail-callout">
          <strong>Interpretasi SIG</strong>
          <span>${interpretationText}</span>
        </div>

        <div class="detail-callout">
          <strong>Bahaya dominan wilayah pada 2024</strong>
          <span>${props.dominantHazard2024} dengan ${props.dominantHazardCount2024} kejadian. ${props.trendLabel}</span>
        </div>

        <div class="detail-callout">
          <strong>Rekomendasi mitigasi</strong>
          <ul class="recommendation-list">
            ${recommendations.map((item) => `<li>${item}</li>`).join("")}
          </ul>
        </div>

        <div class="detail-callout">
          <strong>Periode dan sumber</strong>
          <span>${props.period}</span>
          <span style="display:block;margin-top:8px;">${props.source}</span>
        </div>

        <div>
          <p><strong>Fasilitas pendukung wilayah</strong></p>
          <div class="detail-list">${facilityItems}</div>
        </div>
      </div>
    </article>
  `;
}

function refreshUI() {
  updateRegionLayer();
  updateFacilityLayer();
  updateStats();
  updatePriorityList();
  updateRegionSelect();
  updateRegionList();
  updateDetailPanel();
}

function focusRegion(slug, shouldRevealDetails) {
  const previousSlug = state.selectedSlug;
  state.selectedSlug = slug;

  const previousLayer = findRegionLayer(previousSlug);
  if (previousLayer && previousSlug !== slug) {
    previousLayer.setStyle(getRegionStyle(previousLayer.feature));
  }

  const layer = findRegionLayer(slug);
  if (!layer) {
    refreshUI();
    return;
  }

  layer.setStyle(getRegionStyle(layer.feature));
  layer.bringToFront();
  updateRegionSelect();
  updateRegionList();
  updateDetailPanel();

  if (shouldRevealDetails) {
    setDetailDrawerOpen(true);
  }
}

function resetMapView() {
  map.fitBounds(defaultViewBounds, { padding: [32, 32] });
}

function addLegendControl() {
  const legend = L.control({ position: "bottomleft" });

  legend.onAdd = () => {
    const div = L.DomUtil.create("div", "legend-control");
    div.innerHTML = `
      <strong>Legenda</strong>
      <span><i class="swatch swatch-high"></i>Prioritas tinggi</span>
      <span><i class="swatch swatch-medium"></i>Prioritas menengah</span>
      <span><i class="swatch swatch-low"></i>Prioritas rendah</span>
    `;
    return div;
  };

  legend.addTo(map);
}

function stabilizeMapLayout() {
  window.setTimeout(() => {
    map.invalidateSize();
    resetMapView();
  }, 120);
}

function bindEvents() {
  riskFilter.addEventListener("change", (event) => {
    state.riskFilter = event.target.value;
    refreshUI();
    resetMapView();
  });

  regionSelect.addEventListener("change", (event) => {
    if (!event.target.value) {
      return;
    }
    focusRegion(event.target.value, true);
  });

  toggleBpbd.addEventListener("change", (event) => {
    state.showBpbd = event.target.checked;
    updateFacilityLayer();
    updateStats();
    updateDetailPanel();
  });

  toggleRs.addEventListener("change", (event) => {
    state.showRumahSakit = event.target.checked;
    updateFacilityLayer();
    updateStats();
    updateDetailPanel();
  });

  resetViewButton.addEventListener("click", () => {
    resetMapView();
  });

  detailToggle.addEventListener("click", () => {
    toggleDetailDrawer();
  });

  detailClose.addEventListener("click", () => {
    setDetailDrawerOpen(false);
  });

  detailBackdrop.addEventListener("click", () => {
    setDetailDrawerOpen(false);
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && state.detailDrawerOpen) {
      setDetailDrawerOpen(false);
    }
  });

  window.addEventListener("resize", () => {
    map.invalidateSize();
  });
}

refreshUI();
bindEvents();
addLegendControl();
resetMapView();
focusRegion(regionFeatures[0].properties.slug, false);
stabilizeMapLayout();
