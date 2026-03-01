# Summary
Plugin to run python scripts written in Obsidian code blocks and render plots using local python virtual environment. No internet connection is required for use after initial install.

# Plugin Setup
## Clone Repo
This repo must be cloned into `~/path/to/Obsidian\ Vault/.obsidian/plugins/`.

If this folder is inside a repo that you already have set up (for tracking your Obsidian Vault or maybe your plugins folder), you may want to add this repo as a submodule:
```bash
cd ~/path/to/Obsidian\ Vault/.obsidian/plugins/
git submodule add https://github.com/nlodder/local-python-obsidian.git local-python-obsidian
```

otherwise, clone as you normally would:
```bash
git clone https://github.com/nlodder/local-python-obsidian.git
```

## Create Local Python Virtual Environment
This VENV will contain all the dependencies on which the plugin runs (`numpy`, `plotly`, `python3`, etc.).
You might wish to exclude these from your main Obsidian repo (if you have one); if you wish to use this plugin
on another computer, you can create another virtual environment locally on it.

Also note that you can add python libraries as you wish to the requirements.txt file for them to be made available
to you inside the obsidian plugin.

```bash
# this is where temporary python files will be stored
mkdir ~/path/to/Obsidian\ Vault/Scripts/Temp
cd ~/path/to/Obsidian\ Vault/Scripts
python3 -m venv .venv # create virtual environment inside scripts folder
./.venv/bin/pip install -r ~/path/to/Obsidian\ Vault/.obsidian/plugins/local-python-obsidian/requirements.txt
```

Be sure that your folder structure is now as shown below.
```text
Obsidian Vault/
├── .obsidian/
│   └── plugins/
│       └── local-python-obsidian/      (this repository)
└── Scripts/
|   ├── Temp/                           (holds temporary python files)
|   └── .venv/                          (your python virtual environment)
└── your other files
```

## Enable Plugin in Obsidian Settings
To enable the plugin, go to Obsidian Settings > Community plugins > Installed plugins, and enable the Local Python Runner plugin.
You can also enable a short cut that creates a code block with a skeleton python script (the contents of the `skeleton.py` file in this repo):
Obsidian Settings > Hotkeys > Local Python Runner: Insert Local-Py Skeleton, click '+' and enter your desired shortcut combo on your keyboard.

# Using Plugin
1. Create a code block in your note with `local-py` as the language attribute:

```text
```local-py
```
2. Add your python code, for example:
```local-py
import plotly.express as px
import pandas as pd

# Creating a dataset with a "Month" column
data = {
    "Fruit": ["Dates", "Figs", "Dates", "Figs", "Dates", "Figs"],
    "Amount": [10, 15, 12, 18, 15, 12],
    "Month": ["Jan", "Jan", "Feb", "Feb", "Mar", "Mar"]
}
df = pd.DataFrame(data)

# 'animation_frame' automatically creates the slider and play button
fig = px.bar(df, 
             x="Fruit", 
             y="Amount", 
             animation_frame="Month",
             range_y=[0, 20],
             color_discrete_sequence=['#B87351'])

# Ensure the layout looks clean in Obsidian
fig.update_layout(margin=dict(l=20, r=20, t=40, b=20))
```
3. Click elsewhere in your note (just remove cursor from code block), and you should see a 'Run Code' button appear:
<img width="709" height="74" alt="image" src="https://github.com/user-attachments/assets/09a02114-f903-427f-87aa-9eabe958114b" />
4. Click this button to run the code and display the interactive plot (if you are using plotly).

## Shortcut
Use the shortcut you created (for 'Local Python Runner: Insert Local-Py Skeleton') to insert a code block in your file with the contents of `skeleton.py` inside.
Feel free to modify this file to suit your preferences for your template python script.
