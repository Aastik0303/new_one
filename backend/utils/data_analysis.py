"""
utils/data_analysis.py — EDA, visualisation, and statistics using pandas/matplotlib/seaborn
"""
from __future__ import annotations
import io, base64, json
from typing import Any
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.pyplot
matplotlib.use('Agg') # Required for non-GUI servers like Render
# ... after plotting ...
plt.close('all') # Force clear memory used by the image
import seaborn as sns
from scipy import stats


# ── Seaborn theme ─────────────────────────────────────────
sns.set_theme(style="darkgrid", palette="husl")
PLOT_STYLE = {
    "figure.facecolor": "#0d1117",
    "axes.facecolor": "#161b22",
    "axes.edgecolor": "#30363d",
    "axes.labelcolor": "#c9d1d9",
    "text.color": "#c9d1d9",
    "xtick.color": "#8b949e",
    "ytick.color": "#8b949e",
    "grid.color": "#21262d",
    "grid.alpha": 0.5,
}
plt.rcParams.update(PLOT_STYLE)


def _fig_to_b64(fig: plt.Figure) -> str:
    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=120, bbox_inches="tight", facecolor=fig.get_facecolor())
    plt.close(fig)
    return base64.b64encode(buf.getvalue()).decode()


# ── EDA ───────────────────────────────────────────────────

def generate_eda_report(df: pd.DataFrame) -> dict[str, Any]:
    """Comprehensive EDA report."""
    numeric_cols = df.select_dtypes(include=np.number).columns.tolist()
    categorical_cols = df.select_dtypes(include=["object", "category"]).columns.tolist()
    datetime_cols = df.select_dtypes(include=["datetime"]).columns.tolist()

    missing = df.isnull().sum()
    missing_pct = (missing / len(df) * 100).round(2)

    desc = df[numeric_cols].describe().round(4).to_dict() if numeric_cols else {}

    # Correlation matrix
    corr = None
    if len(numeric_cols) >= 2:
        corr = df[numeric_cols].corr().round(4).to_dict()

    # Skewness & kurtosis
    skew_kurt = {}
    for col in numeric_cols:
        skew_kurt[col] = {
            "skewness": round(float(df[col].skew()), 4),
            "kurtosis": round(float(df[col].kurtosis()), 4),
        }

    # Outlier detection (IQR)
    outliers = {}
    for col in numeric_cols:
        q1, q3 = df[col].quantile(0.25), df[col].quantile(0.75)
        iqr = q3 - q1
        n_outliers = int(((df[col] < q1 - 1.5 * iqr) | (df[col] > q3 + 1.5 * iqr)).sum())
        outliers[col] = n_outliers

    return {
        "shape": {"rows": int(df.shape[0]), "columns": int(df.shape[1])},
        "columns": df.columns.tolist(),
        "dtypes": {k: str(v) for k, v in df.dtypes.items()},
        "numeric_columns": numeric_cols,
        "categorical_columns": categorical_cols,
        "datetime_columns": datetime_cols,
        "missing_values": {
            "counts": missing[missing > 0].to_dict(),
            "percentages": missing_pct[missing_pct > 0].to_dict(),
        },
        "descriptive_stats": desc,
        "correlation": corr,
        "skewness_kurtosis": skew_kurt,
        "outliers_count": outliers,
        "memory_usage_mb": round(df.memory_usage(deep=True).sum() / 1024**2, 3),
        "duplicate_rows": int(df.duplicated().sum()),
    }


# ── Visualisations ────────────────────────────────────────

def plot_histogram(df: pd.DataFrame, column: str, bins: int = 30) -> str:
    fig, axes = plt.subplots(1, 2, figsize=(12, 5), facecolor="#0d1117")
    fig.suptitle(f"Distribution: {column}", color="#c9d1d9", fontsize=14, fontweight="bold")

    data = df[column].dropna()
    axes[0].set_facecolor("#161b22")
    sns.histplot(data, bins=bins, kde=True, color="#58a6ff", ax=axes[0])
    axes[0].set_title("Histogram + KDE", color="#c9d1d9")

    axes[1].set_facecolor("#161b22")
    sns.boxplot(y=data, color="#3fb950", ax=axes[1])
    axes[1].set_title("Box Plot", color="#c9d1d9")

    plt.tight_layout()
    return _fig_to_b64(fig)


def plot_correlation_heatmap(df: pd.DataFrame) -> str:
    numeric_df = df.select_dtypes(include=np.number)
    if numeric_df.shape[1] < 2:
        return ""
    corr = numeric_df.corr()
    fig, ax = plt.subplots(figsize=(max(8, len(corr.columns)), max(6, len(corr.columns) * 0.8)),
                           facecolor="#0d1117")
    ax.set_facecolor("#0d1117")
    mask = np.triu(np.ones_like(corr, dtype=bool))
    sns.heatmap(
        corr, mask=mask, annot=True, fmt=".2f", cmap="coolwarm",
        center=0, square=True, ax=ax,
        annot_kws={"size": 9, "color": "#c9d1d9"},
        cbar_kws={"shrink": 0.8},
    )
    ax.set_title("Correlation Matrix", color="#c9d1d9", fontsize=14, pad=20)
    plt.xticks(rotation=45, ha="right", color="#c9d1d9")
    plt.yticks(rotation=0, color="#c9d1d9")
    plt.tight_layout()
    return _fig_to_b64(fig)


def plot_scatter(df: pd.DataFrame, x_col: str, y_col: str, hue_col: str | None = None) -> str:
    fig, ax = plt.subplots(figsize=(10, 6), facecolor="#0d1117")
    ax.set_facecolor("#161b22")
    sns.scatterplot(data=df, x=x_col, y=y_col, hue=hue_col,
                    palette="husl", alpha=0.7, ax=ax, s=60)
    ax.set_title(f"{x_col} vs {y_col}", color="#c9d1d9", fontsize=13)
    if hue_col and ax.get_legend():
        ax.legend(framealpha=0.3, labelcolor="#c9d1d9")
    plt.tight_layout()
    return _fig_to_b64(fig)


def plot_bar(df: pd.DataFrame, column: str, top_n: int = 20) -> str:
    vc = df[column].value_counts().head(top_n)
    fig, ax = plt.subplots(figsize=(12, 5), facecolor="#0d1117")
    ax.set_facecolor("#161b22")
    colors = sns.color_palette("husl", len(vc))
    ax.barh(vc.index.astype(str), vc.values, color=colors)
    ax.set_title(f"Top {top_n} Values: {column}", color="#c9d1d9", fontsize=13)
    ax.set_xlabel("Count", color="#c9d1d9")
    ax.invert_yaxis()
    plt.tight_layout()
    return _fig_to_b64(fig)


def plot_pairplot(df: pd.DataFrame, columns: list[str] | None = None) -> str:
    numeric = df.select_dtypes(include=np.number)
    cols = columns or numeric.columns[:5].tolist()  # Limit to 5
    subset = numeric[cols].dropna()
    if subset.shape[1] < 2:
        return ""
    g = sns.pairplot(subset, diag_kind="kde", plot_kws={"alpha": 0.5, "color": "#58a6ff"},
                     diag_kws={"color": "#3fb950"})
    g.figure.set_facecolor("#0d1117")
    for ax in g.axes.flatten():
        if ax:
            ax.set_facecolor("#161b22")
    return _fig_to_b64(g.figure)


def plot_missing_values(df: pd.DataFrame) -> str:
    missing = df.isnull().sum()
    missing = missing[missing > 0].sort_values(ascending=False)
    if missing.empty:
        return ""
    fig, ax = plt.subplots(figsize=(10, max(4, len(missing) * 0.4)), facecolor="#0d1117")
    ax.set_facecolor("#161b22")
    pcts = (missing / len(df) * 100).values
    bars = ax.barh(missing.index.tolist(), pcts, color=["#f85149" if p > 50 else "#ffa657" if p > 20 else "#58a6ff" for p in pcts])
    ax.set_xlabel("Missing %", color="#c9d1d9")
    ax.set_title("Missing Values by Column", color="#c9d1d9", fontsize=13)
    ax.invert_yaxis()
    for bar, pct in zip(bars, pcts):
        ax.text(bar.get_width() + 0.5, bar.get_y() + bar.get_height() / 2,
                f"{pct:.1f}%", va="center", color="#c9d1d9", fontsize=9)
    plt.tight_layout()
    return _fig_to_b64(fig)


def plot_time_series(df: pd.DataFrame, date_col: str, value_col: str) -> str:
    df_sorted = df[[date_col, value_col]].dropna().sort_values(date_col)
    fig, ax = plt.subplots(figsize=(12, 5), facecolor="#0d1117")
    ax.set_facecolor("#161b22")
    ax.plot(df_sorted[date_col], df_sorted[value_col], color="#58a6ff", linewidth=1.5)
    ax.fill_between(df_sorted[date_col], df_sorted[value_col],
                    alpha=0.15, color="#58a6ff")
    ax.set_title(f"Time Series: {value_col}", color="#c9d1d9", fontsize=13)
    plt.xticks(rotation=45, color="#c9d1d9")
    plt.tight_layout()
    return _fig_to_b64(fig)
