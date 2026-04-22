import io
import os
import json
import base64
import tempfile
from typing import Optional
import pandas as pd
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import seaborn as sns
from scipy import stats
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel

router = APIRouter(prefix="/api/data", tags=["data_analysis"])

# Session storage for uploaded DataFrames
_sessions: dict[str, pd.DataFrame] = {}

sns.set_theme(style="darkgrid", palette="husl")


def df_to_json(df: pd.DataFrame, max_rows: int = 100) -> dict:
    sample = df.head(max_rows)
    return {
        "columns": list(df.columns),
        "dtypes": {col: str(dt) for col, dt in df.dtypes.items()},
        "shape": list(df.shape),
        "data": sample.to_dict(orient="records"),
        "null_counts": df.isnull().sum().to_dict(),
    }


def fig_to_base64(fig) -> str:
    buf = io.BytesIO()
    fig.savefig(buf, format="png", bbox_inches="tight", dpi=120, facecolor="#0f0f1a")
    buf.seek(0)
    encoded = base64.b64encode(buf.read()).decode()
    plt.close(fig)
    return encoded


@router.post("/upload")
async def upload_csv(file: UploadFile = File(...), session_id: str = Form("default")):
    if not file.filename.endswith((".csv", ".tsv", ".xlsx")):
        raise HTTPException(400, "Only CSV, TSV, XLSX files are supported.")

    content = await file.read()
    try:
        if file.filename.endswith(".xlsx"):
            df = pd.read_excel(io.BytesIO(content))
        elif file.filename.endswith(".tsv"):
            df = pd.read_csv(io.BytesIO(content), sep="\t")
        else:
            df = pd.read_csv(io.BytesIO(content))
    except Exception as e:
        raise HTTPException(400, f"Failed to parse file: {str(e)}")

    _sessions[session_id] = df

    return {
        "message": f"✅ Loaded '{file.filename}' — {df.shape[0]} rows × {df.shape[1]} columns",
        "preview": df_to_json(df, max_rows=50),
    }


@router.get("/eda/{session_id}")
async def get_eda(session_id: str):
    df = _sessions.get(session_id)
    if df is None:
        raise HTTPException(404, "No data found. Please upload a CSV first.")

    numeric_cols = df.select_dtypes(include=np.number).columns.tolist()
    categorical_cols = df.select_dtypes(include=["object", "category"]).columns.tolist()

    describe = df.describe(include="all").fillna("").to_dict()

    # Correlation matrix
    corr_matrix = None
    if len(numeric_cols) >= 2:
        corr_matrix = df[numeric_cols].corr().round(3).to_dict()

    return {
        "shape": list(df.shape),
        "numeric_columns": numeric_cols,
        "categorical_columns": categorical_cols,
        "description": describe,
        "null_counts": df.isnull().sum().to_dict(),
        "correlation_matrix": corr_matrix,
        "memory_usage": f"{df.memory_usage(deep=True).sum() / 1024:.1f} KB",
        "duplicate_rows": int(df.duplicated().sum()),
    }


class PlotRequest(BaseModel):
    session_id: str = "default"
    plot_type: str  # histogram, scatter, box, heatmap, bar, line, pairplot, violin
    x_col: Optional[str] = None
    y_col: Optional[str] = None
    hue_col: Optional[str] = None
    title: Optional[str] = None


@router.post("/plot")
async def generate_plot(req: PlotRequest):
    df = _sessions.get(req.session_id)
    if df is None:
        raise HTTPException(404, "No data found. Please upload a CSV first.")

    fig, ax = plt.subplots(figsize=(10, 6))
    fig.patch.set_facecolor("#0f0f1a")
    ax.set_facecolor("#1a1a2e")
    for spine in ax.spines.values():
        spine.set_edgecolor("#444466")

    title = req.title or f"{req.plot_type.title()} Plot"
    colors = ["#00d4ff", "#ff6b6b", "#51cf66", "#ffd43b", "#cc5de8"]

    try:
        if req.plot_type == "histogram" and req.x_col:
            ax.hist(df[req.x_col].dropna(), bins=30, color="#00d4ff", alpha=0.8, edgecolor="#0f0f1a")
            ax.set_xlabel(req.x_col, color="#aaaacc")
            ax.set_ylabel("Frequency", color="#aaaacc")

        elif req.plot_type == "scatter" and req.x_col and req.y_col:
            scatter_kw = dict(alpha=0.6, s=40)
            if req.hue_col:
                cats = df[req.hue_col].unique()
                for i, cat in enumerate(cats):
                    mask = df[req.hue_col] == cat
                    ax.scatter(df.loc[mask, req.x_col], df.loc[mask, req.y_col],
                               color=colors[i % len(colors)], label=str(cat), **scatter_kw)
                ax.legend(facecolor="#1a1a2e", edgecolor="#444466", labelcolor="white")
            else:
                ax.scatter(df[req.x_col], df[req.y_col], color="#00d4ff", **scatter_kw)
            ax.set_xlabel(req.x_col, color="#aaaacc")
            ax.set_ylabel(req.y_col, color="#aaaacc")

        elif req.plot_type == "box" and req.x_col:
            numeric_cols = df.select_dtypes(include=np.number).columns[:8]
            data_to_plot = [df[c].dropna().values for c in numeric_cols]
            bp = ax.boxplot(data_to_plot, patch_artist=True)
            for i, patch in enumerate(bp["boxes"]):
                patch.set_facecolor(colors[i % len(colors)])
                patch.set_alpha(0.8)
            ax.set_xticklabels(numeric_cols, rotation=30, color="#aaaacc")

        elif req.plot_type == "heatmap":
            numeric_df = df.select_dtypes(include=np.number)
            corr = numeric_df.corr()
            plt.close(fig)
            fig, ax = plt.subplots(figsize=(max(8, len(corr)), max(6, len(corr) - 1)))
            fig.patch.set_facecolor("#0f0f1a")
            sns.heatmap(corr, annot=True, fmt=".2f", cmap="coolwarm", ax=ax,
                        linewidths=0.5, linecolor="#0f0f1a",
                        annot_kws={"color": "white", "size": 9})
            ax.set_facecolor("#1a1a2e")

        elif req.plot_type == "bar" and req.x_col:
            y = req.y_col or df.select_dtypes(include=np.number).columns[0]
            agg = df.groupby(req.x_col)[y].mean().sort_values(ascending=False).head(20)
            bars = ax.bar(range(len(agg)), agg.values, color="#00d4ff", alpha=0.8)
            ax.set_xticks(range(len(agg)))
            ax.set_xticklabels(agg.index, rotation=45, ha="right", color="#aaaacc")
            ax.set_ylabel(y, color="#aaaacc")

        elif req.plot_type == "line" and req.x_col and req.y_col:
            sorted_df = df.sort_values(req.x_col)
            ax.plot(sorted_df[req.x_col], sorted_df[req.y_col],
                    color="#00d4ff", linewidth=2, alpha=0.9)
            ax.fill_between(sorted_df[req.x_col], sorted_df[req.y_col],
                            alpha=0.15, color="#00d4ff")
            ax.set_xlabel(req.x_col, color="#aaaacc")
            ax.set_ylabel(req.y_col, color="#aaaacc")

        elif req.plot_type == "violin" and req.x_col:
            numeric_cols = df.select_dtypes(include=np.number).columns[:6]
            data_to_plot = [df[c].dropna().values for c in numeric_cols]
            parts = ax.violinplot(data_to_plot, showmeans=True, showmedians=True)
            for i, pc in enumerate(parts["bodies"]):
                pc.set_facecolor(colors[i % len(colors)])
                pc.set_alpha(0.7)
            ax.set_xticks(range(1, len(numeric_cols) + 1))
            ax.set_xticklabels(numeric_cols, rotation=30, color="#aaaacc")

        else:
            raise HTTPException(400, f"Unsupported plot type or missing columns: {req.plot_type}")

        ax.set_title(title, color="white", fontsize=14, fontweight="bold", pad=12)
        ax.tick_params(colors="#aaaacc")

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Plot generation failed: {str(e)}")

    return {"image": fig_to_base64(fig), "plot_type": req.plot_type, "title": title}


@router.get("/preview/{session_id}")
async def preview_data(session_id: str, rows: int = 50):
    df = _sessions.get(session_id)
    if df is None:
        raise HTTPException(404, "No data found.")
    return df_to_json(df, max_rows=rows)
