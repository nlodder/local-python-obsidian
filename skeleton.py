import plotly.graph_objects as go
import numpy as np

# Plot Settings
plot_title = "Title"
plot_height = 200

x = np.linspace(0, 10, 100)
y = np.sin(x)

fig = go.Figure(data=go.Scatter(x=x, y=y))

fig.update_layout(
    title=plot_title,
    margin=dict(l=20, r=20, t=60, b=20)
)