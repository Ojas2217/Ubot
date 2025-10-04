from model import get_params,prepare
import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression
import matplotlib.pyplot as plt
from sklearn.metrics import r2_score,mean_absolute_error,root_mean_squared_error
def calculate_score(X_test,y_test,theta1,theta2,bias,hex_ids):

    x1 = X_test[:, 0]
    x2 = X_test[:, 1]
    scores = theta1 * x1 + theta2 * x2 + bias

    # stats
    r2 = r2_score(y_test, scores)
    mae = mean_absolute_error(y_test, scores)
    rmse = root_mean_squared_error(y_test, scores)
    print("R^2:", r2)
    print("MAE:", mae)
    print("RMSE:", rmse)
    # Scatter plot: Predicted vs Actual
    plt.figure(figsize=(7, 7))
    plt.scatter(scores, y_test, alpha=0.3)
    plt.plot([y_test.min(), y_test.max()], [y_test.min(), y_test.max()], 'r--', label="Perfect prediction")
    plt.xlabel("Predicted Net Earnings")
    plt.ylabel("Actual Net Earnings")
    plt.title("Predicted vs Actual Net Earnings")
    plt.legend()
    plt.grid(True)
    plt.show()

    # Bar chart: Metrics
    plt.figure(figsize=(6, 4))
    metrics = [r2, mae, rmse]
    labels = ["R²", "MAE", "RMSE"]
    colors = ["skyblue", "lightgreen", "salmon"]

    plt.bar(labels, metrics, color=colors)
    for i, v in enumerate(metrics):
        plt.text(i, v + 0.05*max(metrics), f"{v:.2f}", ha='center', fontweight='bold')
    plt.title("Regression Performance Metrics")
    plt.show()

    return dict(zip(hex_ids, scores))

    

