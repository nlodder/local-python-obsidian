import plotly.io as pio
import sys
import os

# 1. Inject user code at the root level (no indentation required)
{{SOURCE}}

# 2. Internal Plotly Handling
try:
  if 'fig' in locals():
    # Get user height or default to 450
    local_height = locals().get('plot_height', 450)
    
    fig.update_layout(
      height=local_height,
      paper_bgcolor='rgba(0,0,0,0)',
      plot_bgcolor='rgba(0,0,0,0)',
      font=dict(color='{{TEXT_COLOR}}'),
      xaxis=dict(
        gridcolor='{{TEXT_COLOR}}', 
        zerolinecolor='{{TEXT_COLOR}}',
        showgrid=True
      ),
      yaxis=dict(
        gridcolor='{{TEXT_COLOR}}', 
        zerolinecolor='{{TEXT_COLOR}}',
        showgrid=True
      ),
      margin=dict(l=20, r=20, t=60, b=20),
      template="none"
    )

    pio.write_html(
      fig, 
      file='{{HTML_PATH}}', 
      auto_open=False, 
      full_html=True,
      include_plotlyjs='cdn'
    )
    print("Plot success!")
  else:
    sys.stderr.write("No 'fig' object found. Ensure your script defines 'fig'.")

except Exception as e:
  sys.stderr.write(f"Plotly Error: {str(e)}")