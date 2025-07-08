// Corefinity Magento Wizard JavaScript

// Platform data - Consolidated
const platformData = {
  magento: {
    versions: {
      "2.4.7": {
        php: "8.3",
        mariadb: "10.6",
        redis: "7.2",
        opensearch: "2.11",
      },
      "2.4.6": { php: "8.2", mariadb: "10.5", redis: "7.0", opensearch: "2.9" },
      "2.4.5": { php: "8.1", mariadb: "10.4", redis: "6.2", opensearch: "2.6" },
      "2.4.4": { php: "8.0", mariadb: "10.4", redis: "6.0", opensearch: "2.4" },
      "2.3.7": { php: "7.4", mariadb: "10.3", redis: "5.0", opensearch: "N/A" },
    },
  },
  laravel: {
    versions: {
      11: { php: "8.2", mariadb: "10.6", redis: "7.2", opensearch: "N/A" },
      10: { php: "8.1", mariadb: "10.4", redis: "6.2", opensearch: "N/A" },
      9: { php: "8.0", mariadb: "10.3", redis: "6.0", opensearch: "N/A" },
      8: { php: "7.4", mariadb: "10.3", redis: "5.0", opensearch: "N/A" },
      7: { php: "7.3", mariadb: "10.2", redis: "5.0", opensearch: "N/A" },
    },
  },
  wordpress: {
    versions: {
      6.5: { php: "8.1", mariadb: "10.4", redis: "7.0", opensearch: "N/A" },
      6.4: { php: "8.0", mariadb: "10.3", redis: "6.0", opensearch: "N/A" },
      6.3: { php: "7.4", mariadb: "10.2", redis: "5.0", opensearch: "N/A" },
      6.2: { php: "7.3", mariadb: "10.1", redis: "5.0", opensearch: "N/A" },
      5.9: { php: "7.2", mariadb: "10.0", redis: "4.0", opensearch: "N/A" },
    },
  },
};

// Dependency icons mapping - Consolidated
const dependencyIcons = {
  php: "fab fa-php",
  mariadb: "fas fa-database",
  redis: "fas fa-memory",
  opensearch: "fas fa-search",
};

// Global variables - Consolidated and initialized with default empty values for platform/version
let currentStep = 1;
const totalSteps = 5; // Wizard has 5 main steps, installation is an overlay
let wizardData = {
  storeInfo: {
    storeName: "Sample Store",
  },
  system: {
    platform: "", // Initialized as empty
    version: "", // Initialized as empty
  },
  styles: {
    theme: "luma",
    colors: {
      primary: "#4e54c8",
      secondary: "#8f94fb",
      tertiary: "#19b78a",
    },
    font: "default",
    logoUploaded: false,
  },
  plugins: {
    payments: ["ppcp"],
    addressFinder: [],
    emailSms: [],
  },
};

/**
 * Initializes the wizard by updating the display, navigation, and progress.
 * Loads any previously saved data from local storage.
 */
function initializeWizard() {
  loadWizardData(); // Load data first to populate wizardData
  updateStepDisplay();
  updateNavigation();
  updateProgress();
  updateSummary(); // Ensure summary is updated on initial load
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
    // Allow navigation to previous steps or completed steps
    if (step <= currentStep || $(this).hasClass("completed")) {
      goToStep(step);
    }
  });

  // Platform selection
  $(".platform-card").click(function () {
    $(".platform-card").removeClass("selected");
    $(this).addClass("selected");
    const platform = $(this).data("platform");
    wizardData.system.platform = platform;
    wizardData.system.version = ""; // Reset version when platform changes
    saveWizardData();

    // Show version selection for the chosen platform
    showVersionSelection(platform);
    $("#dependenciesSection").hide(); // Hide dependencies until a version is chosen
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
    updateSummary(); // Update summary when version changes
  });

  // Theme tabs
  $(".tab-btn").click(function () {
    const tab = $(this).data("tab");
    switchTab(tab);
  });

  // Theme card selection (clicking the div selects the radio button)
  $(".theme-card-wrapper").click(function () {
    // Remove 'selected' class from all theme card wrappers
    $(".theme-card-wrapper").removeClass("selected");
    // Add 'selected' class to the clicked theme card wrapper
    $(this).addClass("selected");

    // Find the radio button inside this wrapper and check it
    const radioButton = $(this).find('input[type="radio"]');
    radioButton.prop("checked", true);

    // Trigger the change event on the radio button to update wizardData and summary
    radioButton.trigger("change");
  });

  // Theme selection (radio buttons - still needed for direct radio button clicks or programmatically)
  $('input[name="theme"]').change(function () {
    wizardData.styles.theme = $(this).val();
    saveWizardData();
    updateSummary();
  });

  // Color inputs (both color picker and hex input)
  $('input[type="color"], .color-hex').change(function () {
    const isColorPicker = $(this).is('input[type="color"]');
    let colorValue = $(this).val();
    let colorType;

    if (isColorPicker) {
      colorType = $(this).attr("id").replace("Color", "");
      $(this).siblings(".color-hex").val(colorValue); // Update hex input
    } else {
      // It's a hex input
      if (!isValidHexColor(colorValue)) {
        showNotification(
          "Invalid hex color format. Please use #RRGGBB.",
          "error"
        );
        // Revert to previous valid color or clear input if invalid
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
      $(this).siblings('input[type="color"]').val(colorValue); // Update color picker
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

  // Logo upload
  $("#logoUpload").change(function () {
    handleLogoUpload(this);
  });

  // Upload area click to trigger file input
  $(".upload-area").click(function () {
    $("#logoUpload").click();
  });

  // Plugin actions (add/remove)
  $(".plugin-action").click(function () {
    const pluginItem = $(this).closest(".plugin-item");
    const isSelected = pluginItem.hasClass("selected");

    if (!isSelected) {
      pluginItem.addClass("selected");
      $(this).removeClass("add").addClass("remove").text("Cancel");
    } else {
      pluginItem.removeClass("selected");
      $(this).removeClass("remove").addClass("add").text("Add");
    }
    updatePluginData(); // Update wizardData.plugins based on selections
    saveWizardData(); // Save changes
    updateSummary(); // Update summary
  });

  // Store name input
  $("#storeName").on("input", function () {
    wizardData.storeInfo.storeName = $(this).val();
    saveWizardData();
    updateSummary();
  });

  // Back to Wizard button on installation overlay
  $(".back-to-wizard-btn").click(function () {
    $("#installationOverlay").removeClass("active");
    // Optionally, reset installation progress here if needed
  });
}

/**
 * Displays the version selection dropdown for the given platform.
 * @param {string} platform - The selected platform (e.g., 'magento', 'laravel').
 */
function showVersionSelection(platform) {
  const versionSection = $("#versionSection");
  const versionSelect = $("#versionSelect");

  versionSelect.empty(); // Clear previous options
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
 * @param {string} platform - The selected platform.
 * @param {string} version - The selected version.
 */
function showDependencies(platform, version) {
  const dependenciesSection = $("#dependenciesSection");
  const dependenciesList = $("#dependenciesList");

  dependenciesList.empty(); // Clear previous dependencies

  const dependencies = platformData[platform]?.versions[version];
  if (dependencies) {
    Object.entries(dependencies).forEach(([dep, ver]) => {
      if (ver !== "N/A") {
        const iconClass = dependencyIcons[dep] || "fas fa-cog"; // Default icon
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
      // Mark current step as completed
      $(`.nav-item[data-step="${currentStep}"]`)
        .addClass("completed")
        .removeClass("active");

      currentStep++;
      updateStepDisplay();
      updateNavigation();
      updateProgress();

      // Activate next step
      $(`.nav-item[data-step="${currentStep}"]`).addClass("active");

      // Update summary if on last step
      if (currentStep === totalSteps) {
        updateSummary();
      }
    } else if (currentStep === totalSteps) {
      // If on the last step (Summary), trigger installation
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
    // Deactivate current step
    $(`.nav-item[data-step="${currentStep}"]`).removeClass("active");

    currentStep--;
    updateStepDisplay();
    updateNavigation();
    updateProgress();

    // Activate previous step and remove completed status
    $(`.nav-item[data-step="${currentStep}"]`)
      .addClass("active")
      .removeClass("completed");
  }
}

/**
 * Navigates the wizard directly to a specified step.
 * @param {number} step - The step number to navigate to.
 */
function goToStep(step) {
  if (step >= 1 && step <= totalSteps) {
    // Update nav items: remove active from all, mark previous as completed, activate current
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
 * Updates the state of navigation buttons (back/next) and step counter.
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
 * @param {string} tab - The data-tab attribute value of the tab to activate.
 */
function switchTab(tab) {
  $(".tab-btn").removeClass("active");
  $(`.tab-btn[data-tab="${tab}"]`).addClass("active");

  $(".tab-panel").removeClass("active");
  $(`.tab-panel[data-tab="${tab}"]`).addClass("active");
}

/**
 * Handles the logo file upload, including validation and updating wizard data.
 * @param {HTMLInputElement} input - The file input element.
 */
function handleLogoUpload(input) {
  const file = input.files[0];
  if (file) {
    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      showNotification("File size must be less than 2MB.", "error");
      input.value = ""; // Clear the input
      return;
    }

    // Validate file type
    if (!file.type.match(/^image\/(png|jpg|jpeg|svg\+xml)$/)) {
      showNotification(
        "Please upload a valid image file (PNG, JPG, SVG).",
        "error"
      );
      input.value = ""; // Clear the input
      return;
    }

    // Read file as Data URL (for potential preview, though not implemented here)
    const reader = new FileReader();
    reader.onload = function (e) {
      wizardData.styles.logoUploaded = true;
      saveWizardData();
      updateSummary();
      showNotification("Logo uploaded successfully!", "success");
    };
    reader.readAsDataURL(file);
  } else {
    wizardData.styles.logoUploaded = false; // If no file selected (e.g., user cancelled)
    saveWizardData();
    updateSummary();
  }
}

/**
 * Validates if a given string is a valid hex color code (e.g., #RRGGBB).
 * @param {string} hex - The hex color string to validate.
 * @returns {boolean} True if valid, false otherwise.
 */
function isValidHexColor(hex) {
  return /^#[0-9A-F]{6}$/i.test(hex);
}

/**
 * Updates the wizardData.plugins object based on the currently selected plugin items in the UI.
 */
function updatePluginData() {
  // Reset plugin data to ensure only currently selected are included
  wizardData.plugins = {
    payments: [],
    addressFinder: [],
    emailSms: [],
  };

  // Iterate through each plugin section
  $(".plugin-section").each(function () {
    const sectionTitle = $(this).find(".section-title").text().toLowerCase();
    let category;

    // Determine the category based on the section title
    if (sectionTitle.includes("payment")) {
      category = "payments";
    } else if (sectionTitle.includes("address")) {
      category = "addressFinder";
    } else if (sectionTitle.includes("email") || sectionTitle.includes("sms")) {
      category = "emailSms";
    } else {
      // Fallback for any other sections, though current data structure doesn't use 'other'
      category = "other";
    }

    // Add selected plugins to the corresponding category
    $(this)
      .find(".plugin-item.selected")
      .each(function () {
        const pluginName = $(this).find("h4").text().toLowerCase();
        if (wizardData.plugins[category]) {
          // Ensure category exists
          wizardData.plugins[category].push(pluginName);
        }
      });
  });
  saveWizardData(); // Save changes after updating plugin data
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
      $(this).find(".swatch").css("background-color", "#ffffff"); // Default white if no color
      $(this).find("span").text("N/A");
    }
  });

  // Logo status
  const logoStatus = wizardData.styles.logoUploaded
    ? "Desktop Logo: Logo uploaded"
    : "Desktop Logo: No desktop logo uploaded";
  $(".summary-logos li:first-child").text(logoStatus);

  // Plugins Summary
  const pluginsSummaryList = $("#summaryPluginsList");
  pluginsSummaryList.empty();
  let hasPlugins = false;

  for (const category in wizardData.plugins) {
    if (wizardData.plugins[category].length > 0) {
      hasPlugins = true;
      const categoryName = category
        .replace(/([A-Z])/g, " $1")
        .replace(/^./, (str) => str.toUpperCase()); // Format category name
      const pluginsHtml = `
                <li>
                    <strong>${categoryName}:</strong>
                    <ul>
                        ${wizardData.plugins[category]
                          .map(
                            (p) =>
                              `<li>${
                                p.charAt(0).toUpperCase() + p.slice(1)
                              }</li>`
                          )
                          .join("")}
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
 * @returns {boolean} True if the current step is valid, false otherwise.
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
      // Theme is always selected by default, but check if it's not empty string
      return wizardData.styles.theme !== "";
    case 4: // Plugins (optional)
      return true;
    case 5: // Summary (review)
      return true;
    default:
      return true;
  }
}

/**
 * Displays a validation error notification based on the current step.
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
      message = "Please select a theme."; // Should not happen with default, but good to have.
      break;
    default:
      message = "Please complete all required fields for this step.";
  }
  showNotification(message, "error");
}

/**
 * Saves the current wizard data to localStorage.
 */
function saveWizardData() {
  localStorage.setItem("wizardData", JSON.stringify(wizardData));
}

/**
 * Loads wizard data from localStorage and applies it to the UI.
 */
function loadWizardData() {
  const savedData = localStorage.getItem("wizardData");
  if (savedData) {
    const parsed = JSON.parse(savedData);
    // Merge saved data with default wizardData, ensuring new properties are not lost
    wizardData = {
      ...wizardData,
      ...parsed,
      storeInfo: { ...wizardData.storeInfo, ...parsed.storeInfo },
      system: { ...wizardData.system, ...parsed.system },
      styles: {
        ...wizardData.styles,
        ...parsed.styles,
        colors: { ...wizardData.styles.colors, ...parsed.styles.colors },
      },
      plugins: { ...wizardData.plugins, ...parsed.plugins },
    };

    // Apply loaded data to form elements
    $("#storeName").val(wizardData.storeInfo.storeName);

    // Apply platform selection and trigger version/dependencies display
    if (wizardData.system.platform) {
      $(
        `.platform-card[data-platform="${wizardData.system.platform}"]`
      ).addClass("selected");
      showVersionSelection(wizardData.system.platform); // Populate versions
      if (wizardData.system.version) {
        $("#versionSelect").val(wizardData.system.version);
        showDependencies(wizardData.system.platform, wizardData.system.version); // Show dependencies
      }
    }

    // Apply theme selection
    $(`input[name="theme"][value="${wizardData.styles.theme}"]`).prop(
      "checked",
      true
    );
    // Also apply 'selected' class to the theme card wrapper
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

    // Apply plugin selections
    $(".plugin-item").removeClass("selected");
    $(".plugin-action").removeClass("remove").addClass("add").text("Add");

    for (const category in wizardData.plugins) {
      wizardData.plugins[category].forEach((pluginName) => {
        // Find the plugin item by its h4 text content
        const pluginItem = $(
          `.plugin-item h4:contains('${
            pluginName.charAt(0).toUpperCase() + pluginName.slice(1)
          }')`
        ).closest(".plugin-item");
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

    updateSummary(); // Update summary based on loaded data
  }
}

/**
 * Resets the wizard by clearing localStorage and reloading the page.
 */
function resetWizard() {
  localStorage.removeItem("wizardData");
  location.reload();
}

/**
 * Displays a transient notification message on the screen.
 * @param {string} message - The message to display.
 * @param {string} type - The type of notification ('info', 'success', 'error').
 */
function showNotification(message, type = "info") {
  // Define colors based on type
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
    default: // info
      bgColor = "#3b82f6";
      iconClass = "fa-info-circle";
      break;
  }

  // Create notification element with inline styles for quick setup
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
            animation: slideInRight 0.3s ease forwards; /* Use forwards to keep final state */
        ">
            <i class="fas ${iconClass}" style="margin-right: 1rem;"></i>
            ${message}
        </div>
    `);

  // Add styles for animation if not already present
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

  // Append to body
  $("body").append(notification);

  // Remove after 3 seconds with slide out animation
  setTimeout(() => {
    notification.css("animation", "slideOutRight 0.3s ease forwards");
    setTimeout(() => notification.remove(), 300); // Remove after animation completes
  }, 3000);
}

/**
 * Simulates the installation process with a step-by-step progress display.
 */
async function startInstallationSimulation() {
  const installationOverlay = $("#installationOverlay");
  const installationStepsContainer = $("#installationSteps");
  const backToWizardBtn = $(".back-to-wizard-btn");

  // Show the installation overlay
  installationOverlay.addClass("active");
  backToWizardBtn.hide(); // Hide button initially

  const steps = installationStepsContainer.find(".installation-step");

  // Reset all steps to initial state
  steps.removeClass("active completed");
  steps.find(".step-status i").removeClass().addClass("fas fa-spinner fa-spin");

  for (let i = 0; i < steps.length; i++) {
    const currentInstallationStep = $(steps[i]);
    currentInstallationStep.addClass("active");

    // Simulate delay for each step
    await new Promise((resolve) => setTimeout(resolve, 2000)); // 2 seconds delay

    currentInstallationStep.removeClass("active").addClass("completed");
    currentInstallationStep
      .find(".step-status i")
      .removeClass()
      .addClass("fas fa-check-circle");

    // If it's the last step, update the icon to a final checkmark
    if (i === steps.length - 1) {
      currentInstallationStep
        .find(".step-icon i")
        .removeClass()
        .addClass("fas fa-check-circle");
      showNotification("Installation Complete!", "success");
      backToWizardBtn.show(); // Show back button after completion
    }
  }
}

// Animation helpers (kept for consistency with original, though not directly used by showNotification anymore)
function animateIn(element) {
  $(element)
    .css({
      opacity: 0,
      transform: "translateY(20px)",
    })
    .animate(
      {
        opacity: 1,
        transform: "translateY(0)",
      },
      300
    );
}

function animateOut(element, callback) {
  $(element).animate(
    {
      opacity: 0,
      transform: "translateY(-20px)",
    },
    300,
    callback
  );
}

// Initialize wizard when the document is ready
$(document).ready(function () {
  initializeWizard();
  bindEvents();
});

// Export functions for global access (only one set)
window.nextStep = nextStep;
window.prevStep = prevStep;
window.goToStep = goToStep;
window.switchTab = switchTab;
window.resetWizard = resetWizard;
window.showVersionSelection = showVersionSelection; // Potentially useful if called from HTML directly
window.showDependencies = showDependencies; // Potentially useful if called from HTML directly
