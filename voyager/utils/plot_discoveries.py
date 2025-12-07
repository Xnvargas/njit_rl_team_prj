import pandas as pd
import matplotlib.pyplot as plt

# Config
OUTPUT_PATH = "./plots/item_discovery_curve.png"
AGENT_LABEL = "Voyager-Project"

def plot_curve(discovery_csv_path):
    """Plot number of distinct items vs. prompting iterations using generated item_discovery.csv"""
    df = pd.read_csv(discovery_csv_path)

    # Cumulative num distinct items
    df['distinct_items'] = range(1, len(df) + 1)
    
    # Start at (0,0)
    x = [0] + df['iteration'].to_list()
    y = [0] + df["distinct_items"].tolist()

    fig, ax = plt.subplots(figsize=(8, 4))

    # Step curve
    ax.step(x, y, where="post", label=AGENT_LABEL)

    ax.set_xlabel("Prompting Iterations")
    ax.set_ylabel("Number of Distinct Items")
    ax.set_title("Item Discovery Over Time")
    ax.grid(True, linestyle=":", linewidth=0.5)

    ax.legend(loc='lower right')
    fig.tight_layout()
    fig.savefig(OUTPUT_PATH, dpi=300)
    print(f"Saved plot to {OUTPUT_PATH}")

if __name__ == "__main__":
    plot_curve("/workspaces/njit_rl_team_prj/skill_library/rob_trial1/item_discovery.csv")