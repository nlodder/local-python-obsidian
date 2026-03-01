const { Plugin } = require("obsidian");
const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");

/**
 * Helper to get computed CSS variables from the Obsidian theme
 * @param {string} varName - the name of the CSS variable (e.g., "--text-normal")
 * @returns {string} - the computed color value (e.g., "rgb(255, 255, 255)")
 */
const getCSS = (varName) => {
  const temp = document.body.createEl("div", {
    attr: { style: `display:none; color: var(${varName});` },
  });
  const computedColor = getComputedStyle(temp).color;
  temp.remove();
  return computedColor || "#000000";
};

/**
 * Local Python Runner Obsidian Plugin
 * - executes Python code blocks using a local venv
 * - renders Plotly outputs in iframes
 * - provides error handling and user feedback
 */
module.exports = class LocalPythonRunner extends Plugin {
  async onload() {
    // Check if Python exists on startup
    const pythonPath = this.getPythonPath();
    if (!fs.existsSync(pythonPath)) {
      new Notice(
        "Local Python Runner: Python VENV not found at " + pythonPath,
        5000,
      );
    }

    // Auto-Refresh Logic (Debounced)
    this.setupAutoRefresh();

    /**
     * registerMarkdownCodeBlockProcessor is a built-in Obsidian API that allows
     * us to define custom rendering logic for code blocks with a specific language identifier
     */
    this.registerMarkdownCodeBlockProcessor("local-py", (source, el, ctx) => {
      this.renderPythonBlock(source, el);
    });

    // Command: Insert Skeleton
    this.addCommand({
      id: "insert-local-py-skeleton",
      name: "Insert Local-Py Skeleton",
      editorCallback: async (editor) => {
        const skeleton = await this.getFileContent("skeleton.py");
        editor.replaceSelection(`\`\`\`local-py\n${skeleton}\n\`\`\``);
      },
    });
  }

  /**
   * Watches for theme changes and triggers all visible "Run" buttons
   */
  setupAutoRefresh() {
    let debounceTimer;
    this.registerEvent(
      this.app.workspace.on("css-change", () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          const runButtons = document.querySelectorAll(".local-py-run-button");
          runButtons.forEach((btn, index) => {
            setTimeout(() => btn.click(), index * 100);
          });
        }, 500);
      }),
    );
  }

  /**
   * Safely reads a file from the plugin's directory
   * @param {string} fileName - name of the file to read (e.g., "wrapper.py")
   * @returns {Promise<string>} - file content or error message
   */
  async getFileContent(fileName) {
    try {
      const pluginDir =
        this.app.vault.configDir + "/plugins/" + this.manifest.id;
      const adapter = this.app.vault.adapter;
      return await adapter.read(pluginDir + "/" + fileName);
    } catch (e) {
      console.error(`Local Python Runner: Failed to load ${fileName}`, e);
      return "# Error: Could not load " + fileName;
    }
  }

  /**
   * Creates "Run Code" button and output area
   * Executes Python code in a temp file and handles output/errors
   * @param {string} source - the Python code from the markdown block
   * @param {HTMLElement} el - the container element for the code block
   */
  async renderPythonBlock(source, el) {
    // CONTAINER for button and output
    const container = el.createEl("div", { cls: "python-runner-container" });
    // RUN BUTTON to execute the code block
    const button = container.createEl("button", {
      text: "Run Code",
      cls: "local-py-run-button",
    });
    // OUTPUT AREA for results or errors
    const outputArea = container.createEl("div", { cls: "python-output-area" });

    /**
     * Event listener for the "Run Code" button
     */
    button.addEventListener("click", async () => {
      outputArea.empty();
      const status = outputArea.createEl("p", {
        text: "Generating local-py output...",
      });

      // Create unique temp file paths to avoid conflicts
      const id = Math.random().toString(36).substring(2, 9);
      const vaultPath = this.app.vault.adapter.getBasePath();
      const pyPath = path.join(vaultPath, "Scripts", "Temp", `temp_${id}.py`);
      const htmlPath = path.join(
        vaultPath,
        "Scripts",
        "Temp",
        `temp_${id}.html`,
      );

      // Path to venv python
      const pythonExe = path.join(
        vaultPath,
        "Scripts",
        ".venv",
        "bin",
        "python3",
      );

      // Load wrapper template and inject variables
      // {{VARNAME}} placeholders in wrapper.py will be replaced with actual values
      let wrapper = await this.getFileContent("wrapper.py");
      const fullCode = wrapper
        .replace(/{{SOURCE}}/g, source)
        .replace(/{{TEXT_COLOR}}/g, getCSS("--text-normal"))
        .replace(/{{HTML_PATH}}/g, htmlPath.replace(/\\/g, "/"));

      // Write temp file
      try {
        fs.writeFileSync(pyPath, fullCode);
      } catch (e) {
        this.showError(outputArea, `Failed to write temp file: ${e.message}`);
        return;
      }

      // Execute the Python script
      exec(`"${pythonExe}" "${pyPath}"`, (error, stdout, stderr) => {
        status.remove();

        // ERROR HANDLING
        if (error) { // system level errors
          this.showError(outputArea, `System Error: ${error.message}`);
          return;
        }
        if(stderr) { // Python runtime errors
          this.showError(outputArea, `Python Error: ${stderr}`);
          return;
        }
        if (stdout.includes("Plot success!")) {
          const htmlContent = fs.readFileSync(htmlPath, "utf8");
          this.renderIframe(outputArea, htmlContent);
        }

        // Cleanup temp files after a short delay
        setTimeout(() => {
          [pyPath, htmlPath].forEach((p) => {
            if (fs.existsSync(p)) fs.unlinkSync(p);
          });
        }, 1000);
      });
    });
  }

  /**
   * Renders the Plotly HTML inside a seamless iframe
   */
  renderIframe(parent, htmlContent) {
    const iframe = parent.createEl("iframe", {
      attr: {
        srcdoc: htmlContent,
        style: `width: 100%; height: 0px; border: none; border-radius: 10px; visibility: hidden; transition: height 0.3s ease-in-out;`,
        sandbox: "allow-scripts allow-same-origin",
      },
    });

    iframe.addEventListener("load", () => {
      const doc = iframe.contentWindow.document;
      const plotlyDiv = doc.querySelector(".plotly-graph-div");

      // Detect height from the Plotly object or fallback to 470
      const heightValue = plotlyDiv ? parseInt(plotlyDiv.style.height) : 450;

      iframe.style.height = `${heightValue + 20}px`;
      iframe.style.visibility = "visible";
    });
  }

  /** 
   * Displays an error message in the output area
   * @param {string} message - error text
   * @param {string} type - error type (e.g., "Error", "Warning")
   * @param {HTMLElement} container - the output area in which to display the error
   */
  showError(container, message, type = "Error") {
    container.empty(); // Clear previous content
    const errorWrap = container.createEl("div", { cls: "local-py-error-container" });
    errorWrap.createEl("strong", { text: `${type}: ` });
    errorWrap.createEl("code", { text: message });
  }

  /**
   * Helper to construct the path to the python executable
   * @returns {string} - the full path to the python executable in the venv
   */
  getPythonPath() {
    const vaultPath = this.app.vault.adapter.getBasePath();
    // Use path.join to handle cross-platform slashes correctly
    return path.join(vaultPath, "Scripts", ".venv", "bin", "python3");
  }
};
