// Corefinity Magento Wizard JavaScript

// Global data variables - loaded from JSON files
let platformData = {};
let pluginsData = {};
let sampleData = {};

// Dependency icons mapping
const dependencyIcons = {
  php: "fab fa-php",
  mariadb: "fas fa-database",
  redis: "fas fa-memory",
  opensearch: "fas fa-search",
};

// Global variables - Updated for 6 steps
let currentStep = 1;
const totalSteps = 6; // Updated to 6 steps including Sample Data
let wizardData = {
  storeInfo: {
    storeName: "Sample Store",
  },
  system: {
    platform: "",
    version: "",
  },
  styles: {
    theme: "luma",
    colors: {
      primary: "#4e54c8",
      secondary: "#8f94fb",
      tertiary: "#19b78a",
    },
    font: "default",
    logos: {
      desktop: {
        uploaded: false,
        filename: "",
      },
      mobile: {
        uploaded: false,
        filename: "",
      },
    },
  },
  plugins: {
    payments: [],
    addressFinder: [],
    emailSms: [],
    taxShipping: [],
    reviewsUgc: [],
    searchMerchandising: [],
  },
  sampleData: {
    useSampleData: true,
  },
};

/**
 * Loads JSON data files
 */
async function loadDataFiles() {
  try {
    // Load platform data
    const platformResponse = await fetch("assets/data/platform-data.json");
    platformData = await platformResponse.json();

    // Load plugins data
    const pluginsResponse = await fetch("assets/data/plugins-data.json");
    pluginsData = await pluginsResponse.json();

    // Load sample data
    const sampleDataResponse = await fetch("assets/data/sample-data.json");
    sampleData = await sampleDataResponse.json();
  } catch (error) {
    console.error("Error loading data files:", error);
    showNotification(
      "Error loading configuration data. Please refresh the page.",
      "error"
    );
  }
}

/**
 * Initializes the wizard by updating the display, navigation, and progress.
 * Loads any previously saved data from local storage.
 */
async function initializeWizard() {
  await loadDataFiles(); // Load JSON data first
  loadWizardData(); // Load saved data
  updateStepDisplay();
  updateNavigation();
  updateProgress();
  updateSummary();

  // Load plugins into the UI
  loadPluginsIntoUI();

  // Load sample data into the UI
  loadSampleDataIntoUI();

  // Initialize Dropify for logo uploads
  initializeDropify();
}

/**
 * Loads plugins from JSON data into the UI
 */
function loadPluginsIntoUI() {
  const pluginsContainer = $(".plugins-container");
  pluginsContainer.empty();

  Object.keys(pluginsData).forEach((categoryKey) => {
    const category = pluginsData[categoryKey];

    const sectionHtml = `
      <div class="plugin-section" data-category="${categoryKey}">
        <h3 class="section-title">${category.title}</h3>
        <p class="section-description">${category.description}</p>
        <div class="plugin-list">
          ${category.plugins
            .map((plugin) => {
              const iconHtml = plugin.icon.startsWith("letter:")
                ? `<div class="icon-letter">${plugin.icon.replace(
                    "letter:",
                    ""
                  )}</div>`
                : `<img src="${plugin.icon}" alt="${plugin.name}" />`;

              const isSelected = plugin.selected ? "selected" : "";
              const buttonText = plugin.selected ? "Cancel" : "Add";
              const buttonClass = plugin.selected ? "remove" : "add";

              return `
              <div class="plugin-item ${isSelected}" data-plugin-id="${plugin.id}">
                <div class="plugin-icon">
                  ${iconHtml}
                </div>
                <div class="plugin-info">
                  <h4>${plugin.name}</h4>
                  <p>${plugin.description}</p>
                </div>
                <button class="plugin-action ${buttonClass}">${buttonText}</button>
              </div>
            `;
            })
            .join("")}
        </div>
      </div>
    `;

    pluginsContainer.append(sectionHtml);
  });
}

/**
 * Loads sample data options into the UI
 */
function loadSampleDataIntoUI() {
  const sampleDataContainer = $("#sampleDataOptions");
  if (sampleDataContainer.length && sampleData.sampleData) {
    const optionsHtml = sampleData.sampleData.options
      .map((option) => {
        const checked = option.selected ? "checked" : "";
        return `
        <div class="sample-data-option">
          <input type="radio" name="sampleData" value="${option.value}" id="${
          option.id
        }" ${checked} />
          <label for="${option.id}" class="sample-data-label">
            <div class="sample-data-content">
              <i class="fas ${
                option.value ? "fa-check-circle" : "fa-times-circle"
              }"></i>
              <span>${option.label}</span>
            </div>
          </label>
        </div>
      `;
      })
      .join("");

    sampleDataContainer.html(optionsHtml);
  }
}

/**
 * Binds all event listeners for the wizard's interactive elements.
 */
function bindEvents() {
  // Navigation buttons
  $("#nextBtn").click(nextStep);
  $("#backBtn").click(prevStep);

  // Sidebar navigation
  $(".nav-item").click(function () {
    const step = parseInt($(this).data("step"));
    if (step <= currentStep || $(this).hasClass("completed")) {
      goToStep(step);
    }
  });

  // Platform selection
  $(document).on("click", ".platform-card", function () {
    $(".platform-card").removeClass("selected");
    $(this).addClass("selected");
    const platform = $(this).data("platform");
    wizardData.system.platform = platform;
    wizardData.system.version = "";
    saveWizardData();

    showVersionSelection(platform);
    $("#dependenciesSection").hide();
  });

  // Version selection
  $("#versionSelect").change(function () {
    const version = $(this).val();
    wizardData.system.version = version;
    saveWizardData();

    if (version) {
      showDependencies(wizardData.system.platform, version);
    } else {
      $("#dependenciesSection").hide();
    }
    updateSummary();
  });

  // Theme tabs
  $(".tab-btn").click(function () {
    const tab = $(this).data("tab");
    switchTab(tab);
  });

  // Theme card selection
  $(".theme-card-wrapper").click(function () {
    $(".theme-card-wrapper").removeClass("selected");
    $(this).addClass("selected");

    const radioButton = $(this).find('input[type="radio"]');
    radioButton.prop("checked", true);
    radioButton.trigger("change");
  });

  // Theme selection (radio buttons)
  $('input[name="theme"]').change(function () {
    wizardData.styles.theme = $(this).val();
    saveWizardData();
    updateSummary();
  });

  // Color inputs
  $('input[type="color"], .color-hex').change(function () {
    const isColorPicker = $(this).is('input[type="color"]');
    let colorValue = $(this).val();
    let colorType;

    if (isColorPicker) {
      colorType = $(this).attr("id").replace("Color", "");
      $(this).siblings(".color-hex").val(colorValue);
    } else {
      if (!isValidHexColor(colorValue)) {
        showNotification(
          "Invalid hex color format. Please use #RRGGBB.",
          "error"
        );
        colorValue =
          wizardData.styles.colors[
            $(this)
              .siblings('input[type="color"]')
              .attr("id")
              .replace("Color", "")
          ];
        $(this).val(colorValue);
        $(this).siblings('input[type="color"]').val(colorValue);
        return;
      }
      colorType = $(this)
        .siblings('input[type="color"]')
        .attr("id")
        .replace("Color", "");
      $(this).siblings('input[type="color"]').val(colorValue);
    }

    wizardData.styles.colors[colorType] = colorValue;
    saveWizardData();
    updateSummary();
  });

  // Font selection
  $("#fontSelect").change(function () {
    wizardData.styles.font = $(this).val();
    saveWizardData();
    updateSummary();
  });

  // Sample data selection
  $(document).on("change", 'input[name="sampleData"]', function () {
    wizardData.sampleData.useSampleData = $(this).val() === "true";
    saveWizardData();
    updateSummary();
  });

  // Plugin actions (delegated event binding for dynamically loaded content)
  $(document).on("click", ".plugin-action", function () {
    const pluginItem = $(this).closest(".plugin-item");
    const isSelected = pluginItem.hasClass("selected");

    if (!isSelected) {
      pluginItem.addClass("selected");
      $(this).removeClass("add").addClass("remove").text("Cancel");
    } else {
      pluginItem.removeClass("selected");
      $(this).removeClass("remove").addClass("add").text("Add");
    }
    updatePluginData();
    saveWizardData();
    updateSummary();
  });

  // Store name input
  $("#storeName").on("input", function () {
    wizardData.storeInfo.storeName = $(this).val();
    saveWizardData();
    updateSummary();
  });

  // Back to Wizard button
  $(".back-to-wizard-btn").click(function () {
    $("#installationOverlay").removeClass("active");
  });
}

/**
 * Displays the version selection dropdown for the given platform.
 */
function showVersionSelection(platform) {
  const versionSection = $("#versionSection");
  const versionSelect = $("#versionSelect");

  versionSelect.empty();
  versionSelect.append('<option value="">Choose version...</option>');

  if (platformData[platform] && platformData[platform].versions) {
    const versions = Object.keys(platformData[platform].versions);
    versions.forEach((version) => {
      versionSelect.append(`<option value="${version}">${version}</option>`);
    });
  }
  versionSection.show();
}

/**
 * Displays the dependencies for the selected platform and version.
 */
function showDependencies(platform, version) {
  const dependenciesSection = $("#dependenciesSection");
  const dependenciesList = $("#dependenciesList");

  dependenciesList.empty();

  const dependencies = platformData[platform]?.versions[version];
  if (dependencies) {
    Object.entries(dependencies).forEach(([dep, ver]) => {
      if (ver !== "N/A") {
        const iconClass = dependencyIcons[dep] || "fas fa-cog";
        const dependencyHtml = `
          <div class="dependency-item">
            <div class="dependency-icon ${dep}">
              <i class="${iconClass}"></i>
            </div>
            <div class="dependency-details">
              <div class="dependency-name">${dep.toUpperCase()}</div>
              <div class="dependency-version">v${ver}</div>
            </div>
          </div>
        `;
        dependenciesList.append(dependencyHtml);
      }
    });
    dependenciesSection.show();
  } else {
    dependenciesSection.hide();
  }
}

/**
 * Advances the wizard to the next step after validating the current step.
 */
function nextStep() {
  if (validateCurrentStep()) {
    if (currentStep < totalSteps) {
      $(`.nav-item[data-step="${currentStep}"]`)
        .addClass("completed")
        .removeClass("active");

      currentStep++;
      updateStepDisplay();
      updateNavigation();
      updateProgress();

      $(`.nav-item[data-step="${currentStep}"]`).addClass("active");

      if (currentStep === totalSteps) {
        updateSummary();
      }
    } else if (currentStep === totalSteps) {
      startInstallationSimulation();
    }
  } else {
    showValidationError();
  }
}

/**
 * Moves the wizard to the previous step.
 */
function prevStep() {
  if (currentStep > 1) {
    $(`.nav-item[data-step="${currentStep}"]`).removeClass("active");

    currentStep--;
    updateStepDisplay();
    updateNavigation();
    updateProgress();

    $(`.nav-item[data-step="${currentStep}"]`)
      .addClass("active")
      .removeClass("completed");
  }
}

/**
 * Navigates the wizard directly to a specified step.
 */
function goToStep(step) {
  if (step >= 1 && step <= totalSteps) {
    $(".nav-item").removeClass("active completed");
    for (let i = 1; i < step; i++) {
      $(`.nav-item[data-step="${i}"]`).addClass("completed");
    }
    $(`.nav-item[data-step="${step}"]`).addClass("active");

    currentStep = step;
    updateStepDisplay();
    updateNavigation();
    updateProgress();

    if (currentStep === totalSteps) {
      updateSummary();
    }
  }
}

/**
 * Updates which step content is currently visible.
 */
function updateStepDisplay() {
  $(".step-content").removeClass("active");
  $(`.step-content[data-step="${currentStep}"]`).addClass("active");
}

/**
 * Updates the state of navigation buttons and step counter.
 */
function updateNavigation() {
  $("#backBtn").prop("disabled", currentStep === 1);
  $("#currentStep").text(currentStep);

  if (currentStep === totalSteps) {
    $("#nextBtn").html('<i class="fas fa-rocket"></i> Start Installation');
  } else {
    $("#nextBtn").html('Next Step <i class="fas fa-arrow-right"></i>');
  }
}

/**
 * Updates the progress bar's width based on the current step.
 */
function updateProgress() {
  const progress = (currentStep / totalSteps) * 100;
  $("#progressFill").css("width", progress + "%");
}

/**
 * Switches the active tab in the styles section.
 */
function switchTab(tab) {
  $(".tab-btn").removeClass("active");
  $(`.tab-btn[data-tab="${tab}"]`).addClass("active");

  $(".tab-panel").removeClass("active");
  $(`.tab-panel[data-tab="${tab}"]`).addClass("active");
}

/**
 * Initializes Dropify for logo upload fields
 */
function initializeDropify() {
  // Initialize dropify
  $(".dropify").dropify({
    messages: {
      default: "Drag and drop a file here or click",
      replace: "Drag and drop or click to replace",
      remove: "Remove",
      error: "Ooops, something wrong happened.",
    },
  });

  // Handle desktop logo upload
  $("#desktopLogoUpload").on("change", function () {
    handleLogoUpload(this, "desktop");
  });

  // Handle mobile logo upload
  $("#mobileLogoUpload").on("change", function () {
    handleLogoUpload(this, "mobile");
  });
}

/**
 * Handles logo file upload for both desktop and mobile
 */
function handleLogoUpload(input, type) {
  const file = input.files[0];
  if (file) {
    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      showNotification(
        `${type} logo file size must be less than 2MB.`,
        "error"
      );
      $(input).dropify("clear");
      return;
    }

    // Validate file type
    if (!file.type.match(/^image\/(png|jpg|jpeg|svg\+xml)$/)) {
      showNotification(
        `Please upload a valid ${type} logo image file (PNG, JPG, SVG).`,
        "error"
      );
      $(input).dropify("clear");
      return;
    }

    // Read file for validation and storage
    const reader = new FileReader();
    reader.onload = function (e) {
      wizardData.styles.logos[type].uploaded = true;
      wizardData.styles.logos[type].filename = file.name;
      saveWizardData();
      updateSummary();
      showNotification(
        `${
          type.charAt(0).toUpperCase() + type.slice(1)
        } logo uploaded successfully!`,
        "success"
      );
    };
    reader.readAsDataURL(file);
  } else {
    // File was removed
    wizardData.styles.logos[type].uploaded = false;
    wizardData.styles.logos[type].filename = "";
    saveWizardData();
    updateSummary();
  }
}

/**
 * Validates if a given string is a valid hex color code.
 */
function isValidHexColor(hex) {
  return /^#[0-9A-F]{6}$/i.test(hex);
}

/**
 * Updates the wizardData.plugins object based on selected plugins.
 */
function updatePluginData() {
  // Reset plugin data
  wizardData.plugins = {
    payments: [],
    addressFinder: [],
    emailSms: [],
    taxShipping: [],
    reviewsUgc: [],
    searchMerchandising: [],
  };

  // Map category keys to wizardData properties
  const categoryMapping = {
    payments: "payments",
    addressFinder: "addressFinder",
    emailSms: "emailSms",
    taxShipping: "taxShipping",
    reviewsUgc: "reviewsUgc",
    searchMerchandising: "searchMerchandising",
  };

  // Iterate through each plugin section
  $(".plugin-section").each(function () {
    const categoryKey = $(this).data("category");
    const wizardCategory = categoryMapping[categoryKey];

    if (wizardCategory) {
      // Add selected plugins to the corresponding category
      $(this)
        .find(".plugin-item.selected")
        .each(function () {
          const pluginId = $(this).data("plugin-id");
          wizardData.plugins[wizardCategory].push(pluginId);
        });
    }
  });
  saveWizardData();
}

/**
 * Updates the summary section with the current wizard data.
 */
function updateSummary() {
  // Store Information
  $("#summaryStoreName").text(wizardData.storeInfo.storeName || "N/A");

  // System Options
  $("#summaryPlatform").text(
    wizardData.system.platform
      ? wizardData.system.platform.charAt(0).toUpperCase() +
          wizardData.system.platform.slice(1)
      : "N/A"
  );
  $("#summaryVersion").text(wizardData.system.version || "N/A");

  // Styles
  $("#summaryTheme").text(
    wizardData.styles.theme.charAt(0).toUpperCase() +
      wizardData.styles.theme.slice(1)
  );

  // Update color swatches
  const colorKeys = Object.keys(wizardData.styles.colors);
  $(".color-swatches .color-swatch").each(function (index) {
    const colorType = colorKeys[index];
    const colorValue = wizardData.styles.colors[colorType];
    if (colorValue) {
      $(this).find(".swatch").css("background-color", colorValue);
      $(this).find("span").text(colorValue);
    } else {
      $(this).find(".swatch").css("background-color", "#ffffff");
      $(this).find("span").text("N/A");
    }
  });

  // Logo status
  const desktopLogoStatus = wizardData.styles.logos.desktop.uploaded
    ? `Desktop Logo: ${wizardData.styles.logos.desktop.filename}`
    : "Desktop Logo: No desktop logo uploaded";

  const mobileLogoStatus = wizardData.styles.logos.mobile.uploaded
    ? `Mobile Logo: ${wizardData.styles.logos.mobile.filename}`
    : "Mobile Logo: No mobile logo uploaded";

  $(".summary-logos li:first-child").text(desktopLogoStatus);
  $(".summary-logos li:last-child").text(mobileLogoStatus);

  // Sample Data status
  const sampleDataStatus = wizardData.sampleData.useSampleData
    ? "Sample data will be installed"
    : "No sample data will be installed";
  $("#summarySampleData").text(sampleDataStatus);

  // Plugins Summary
  const pluginsSummaryList = $("#summaryPluginsList");
  pluginsSummaryList.empty();
  let hasPlugins = false;

  // Map plugin categories to display names
  const categoryDisplayNames = {
    payments: "Payments",
    addressFinder: "Address Finder",
    emailSms: "Email & SMS",
    taxShipping: "Tax & Shipping",
    reviewsUgc: "Reviews & UGC",
    searchMerchandising: "Search & Merchandising",
  };

  for (const category in wizardData.plugins) {
    if (wizardData.plugins[category].length > 0) {
      hasPlugins = true;
      const categoryName = categoryDisplayNames[category] || category;

      // Get plugin names from pluginsData
      const pluginNames = wizardData.plugins[category].map((pluginId) => {
        // Find the plugin name from the loaded data
        for (const catKey in pluginsData) {
          const plugin = pluginsData[catKey].plugins.find(
            (p) => p.id === pluginId
          );
          if (plugin) return plugin.name;
        }
        return pluginId; // fallback to ID if not found
      });

      const pluginsHtml = `
        <li>
          <strong>${categoryName}:</strong>
          <ul>
            ${pluginNames.map((name) => `<li>${name}</li>`).join("")}
          </ul>
        </li>
      `;
      pluginsSummaryList.append(pluginsHtml);
    }
  }
  if (!hasPlugins) {
    pluginsSummaryList.append("<li>No plugins selected.</li>");
  }
}

/**
 * Validates the current step's data before proceeding.
 */
function validateCurrentStep() {
  switch (currentStep) {
    case 1: // Store Information
      return wizardData.storeInfo.storeName.trim() !== "";
    case 2: // System Options
      return (
        wizardData.system.platform !== "" && wizardData.system.version !== ""
      );
    case 3: // Styles
      return wizardData.styles.theme !== "";
    case 4: // Plugins (optional)
      return true;
    case 5: // Sample Data
      return true;
    case 6: // Summary (review)
      return true;
    default:
      return true;
  }
}

/**
 * Displays a validation error notification.
 */
function showValidationError() {
  let message = "";
  switch (currentStep) {
    case 1:
      message = "Please enter a store name.";
      break;
    case 2:
      if (!wizardData.system.platform) {
        message = "Please select a platform.";
      } else if (!wizardData.system.version) {
        message = "Please select a version.";
      }
      break;
    case 3:
      message = "Please select a theme.";
      break;
    default:
      message = "Please complete all required fields for this step.";
  }
  showNotification(message, "error");
}

/**
 * Saves wizard data to localStorage.
 */
function saveWizardData() {
  localStorage.setItem("wizardData", JSON.stringify(wizardData));
}

/**
 * Loads wizard data from localStorage.
 */
function loadWizardData() {
  const savedData = localStorage.getItem("wizardData");
  if (savedData) {
    const parsed = JSON.parse(savedData);
    wizardData = {
      ...wizardData,
      ...parsed,
      storeInfo: { ...wizardData.storeInfo, ...parsed.storeInfo },
      system: { ...wizardData.system, ...parsed.system },
      styles: {
        ...wizardData.styles,
        ...parsed.styles,
        colors: { ...wizardData.styles.colors, ...parsed.styles?.colors },
        logos: {
          ...wizardData.styles.logos,
          ...parsed.styles?.logos,
          desktop: {
            ...wizardData.styles.logos.desktop,
            ...parsed.styles?.logos?.desktop,
          },
          mobile: {
            ...wizardData.styles.logos.mobile,
            ...parsed.styles?.logos?.mobile,
          },
        },
      },
      plugins: { ...wizardData.plugins, ...parsed.plugins },
      sampleData: { ...wizardData.sampleData, ...parsed.sampleData },
    };

    // Apply loaded data to form elements
    $("#storeName").val(wizardData.storeInfo.storeName);

    // Apply platform selection
    if (wizardData.system.platform) {
      $(
        `.platform-card[data-platform="${wizardData.system.platform}"]`
      ).addClass("selected");
      showVersionSelection(wizardData.system.platform);
      if (wizardData.system.version) {
        $("#versionSelect").val(wizardData.system.version);
        showDependencies(wizardData.system.platform, wizardData.system.version);
      }
    }

    // Apply theme selection
    $(`input[name="theme"][value="${wizardData.styles.theme}"]`).prop(
      "checked",
      true
    );
    $(`.theme-card[data-theme="${wizardData.styles.theme}"]`)
      .closest(".theme-card-wrapper")
      .addClass("selected");

    // Apply colors
    Object.entries(wizardData.styles.colors).forEach(([key, value]) => {
      $(`#${key}Color`).val(value);
      $(`input[type="color"]#${key}Color`).siblings(".color-hex").val(value);
    });

    // Apply font selection
    $("#fontSelect").val(wizardData.styles.font);

    // Apply sample data selection
    $(
      `input[name="sampleData"][value="${wizardData.sampleData.useSampleData}"]`
    ).prop("checked", true);

    updateSummary();
  }
}

/**
 * Applies saved plugin selections to the UI after plugins are loaded
 */
function applySavedPluginSelections() {
  // Reset all plugin selections first
  $(".plugin-item").removeClass("selected");
  $(".plugin-action").removeClass("remove").addClass("add").text("Add");

  // Apply saved selections
  for (const category in wizardData.plugins) {
    wizardData.plugins[category].forEach((pluginId) => {
      const pluginItem = $(`.plugin-item[data-plugin-id="${pluginId}"]`);
      if (pluginItem.length) {
        pluginItem.addClass("selected");
        pluginItem
          .find(".plugin-action")
          .removeClass("add")
          .addClass("remove")
          .text("Cancel");
      }
    });
  }
}

/**
 * Resets the wizard.
 */
function resetWizard() {
  localStorage.removeItem("wizardData");
  location.reload();
}

/**
 * Displays a notification message.
 */
function showNotification(message, type = "info") {
  let bgColor;
  let iconClass;
  switch (type) {
    case "error":
      bgColor = "#ef4444";
      iconClass = "fa-exclamation-circle";
      break;
    case "success":
      bgColor = "#22c55e";
      iconClass = "fa-check-circle";
      break;
    default:
      bgColor = "#3b82f6";
      iconClass = "fa-info-circle";
      break;
  }

  const notification = $(`
    <div class="notification ${type}" style="
      position: fixed;
      top: 2rem;
      right: 2rem;
      background: ${bgColor};
      color: white;
      padding: 1.5rem 2rem;
      border-radius: 0.8rem;
      font-weight: 600;
      z-index: 10000;
      box-shadow: 0 0.4rem 1.2rem rgba(0, 0, 0, 0.2);
      animation: slideInRight 0.3s ease forwards;
    ">
      <i class="fas ${iconClass}" style="margin-right: 1rem;"></i>
      ${message}
    </div>
  `);

  if (!$("#notification-styles").length) {
    $("head").append(`
      <style id="notification-styles">
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOutRight {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(100%); opacity: 0; }
        }
      </style>
    `);
  }

  $("body").append(notification);

  setTimeout(() => {
    notification.css("animation", "slideOutRight 0.3s ease forwards");
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

/**
 * Simulates the installation process.
 */
async function startInstallationSimulation() {
  const installationOverlay = $("#installationOverlay");
  const installationStepsContainer = $("#installationSteps");
  const backToWizardBtn = $(".back-to-wizard-btn");

  installationOverlay.addClass("active");
  backToWizardBtn.hide();

  const steps = installationStepsContainer.find(".installation-step");

  steps.removeClass("active completed");
  steps.find(".step-status i").removeClass().addClass("fas fa-spinner fa-spin");

  for (let i = 0; i < steps.length; i++) {
    const currentInstallationStep = $(steps[i]);
    currentInstallationStep.addClass("active");

    await new Promise((resolve) => setTimeout(resolve, 2000));

    currentInstallationStep.removeClass("active").addClass("completed");
    currentInstallationStep
      .find(".step-status i")
      .removeClass()
      .addClass("fas fa-check-circle");

    if (i === steps.length - 1) {
      currentInstallationStep
        .find(".step-icon i")
        .removeClass()
        .addClass("fas fa-check-circle");
      showNotification("Installation Complete!", "success");
      backToWizardBtn.show();
    }
  }
}

// Initialize wizard when document is ready
$(document).ready(function () {
  initializeWizard().then(() => {
    // Apply saved plugin selections after plugins are loaded
    setTimeout(() => {
      applySavedPluginSelections();
    }, 100);
  });
  bindEvents();
});

// Export functions for global access
window.nextStep = nextStep;
window.prevStep = prevStep;
window.goToStep = goToStep;
window.switchTab = switchTab;
window.resetWizard = resetWizard;
window.showVersionSelection = showVersionSelection;
window.showDependencies = showDependencies;
