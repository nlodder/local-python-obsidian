const { Plugin } = require("obsidian");
const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");

/**
 * Helper to get computed CSS variables from the Obsidian theme
 */
const getCSS = (varName) => {
  const temp = document.body.createEl("div", {
    attr: { style: `display:none; color: var(${varName});` }
  });
  const computedColor = getComputedStyle(temp).color;
  temp.remove();
  return computedColor || "#000000";
};

module.exports = class LocalPythonRunner extends Plugin {
  async onload() {
    // --- 1. Auto-Refresh Logic (Debounced) ---
    this.setupAutoRefresh();

    // --- 2. Markdown Code Block Processor ---
    this.registerMarkdownCodeBlockProcessor("local-py", (source, el, ctx) => {
      this.renderPythonBlock(source, el);
    });

    // --- 3. Command: Insert Skeleton ---
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
      })
    );
  }

  /**
   * Safely reads a file from the plugin's directory
   */
  async getFileContent(fileName) {
    try {
      const pluginDir = this.app.vault.configDir + "/plugins/" + this.manifest.id;
      const adapter = this.app.vault.adapter;
      return await adapter.read(pluginDir + "/" + fileName);
    } catch (e) {
      console.error(`Local Python Runner: Failed to load ${fileName}`, e);
      return "# Error: Could not load " + fileName;
    }
  }

  /**
   * Main UI and Execution logic for the code block
   */
  async renderPythonBlock(source, el) {
    const container = el.createEl("div", { cls: "python-runner-container" });
    const button = container.createEl("button", { text: "Run Code", cls: "local-py-run-button" });
    const outputArea = container.createEl("div", { cls: "python-output-area" });

    button.addEventListener("click", async () => {
      outputArea.empty();
      const status = outputArea.createEl("p", { text: "Generating local-py output..." });

      const id = Math.random().toString(36).substring(2, 9);
      const vaultPath = this.app.vault.adapter.getBasePath();
      const pyPath = path.join(vaultPath, "Scripts", "Temp", `temp_${id}.py`);
      const htmlPath = path.join(vaultPath, "Scripts", "Temp", `temp_${id}.html`);
      
      // Path to your venv python
      const pythonExe = path.join(vaultPath, "Scripts", ".venv", "bin", "python3");

      // Load wrapper template and inject variables
      let wrapper = await this.getFileContent("wrapper.py");
      const fullCode = wrapper
        .replace(/{{SOURCE}}/g, source)
        .replace(/{{TEXT_COLOR}}/g, getCSS('--text-normal'))
        .replace(/{{HTML_PATH}}/g, htmlPath.replace(/\\/g, "/"));

      // Write temp file
      fs.writeFileSync(pyPath, fullCode);

      // Execute
      exec(`"${pythonExe}" "${pyPath}"`, (error, stdout, stderr) => {
        status.remove();

        if (error || stderr) {
          outputArea.createEl("pre", { 
            text: `Error: ${stderr || error.message}`, 
            cls: "error-msg" 
          });
          return;
        }

        if (stdout.includes("Plot success!")) {
          const htmlContent = fs.readFileSync(htmlPath, "utf8");
          this.renderIframe(outputArea, htmlContent);
        }

        // Cleanup temp files after a short delay
        setTimeout(() => {
          [pyPath, htmlPath].forEach(p => {
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
};