import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression
import matplotlib.pyplot as plt
from sklearn.model_selection import train_test_split

def prepare():
    heat =  pd.read_csv("Force-Pushers---Smart-Earner-Assistant-\\csvs\\heatmap.csv") 
    earnings = pd.read_csv("Force-Pushers---Smart-Earner-Assistant-\\csvs\\earnings_daily.csv")
    surges = pd.read_csv("Force-Pushers---Smart-Earner-Assistant-\\csvs\\surge_by_hour.csv")
    rides = pd.read_csv("Force-Pushers---Smart-Earner-Assistant-\\csvs\\rides_trips.csv")

    df = rides.merge(
        earnings,
        left_on=["driver_id", "city_id", "date"],
        right_on=["earner_id", "city_id", "date"],
        how="left"
    )

    df["hour"] = pd.to_datetime(df["start_time"]).dt.hour
    df = df.merge(
        surges,
        on=["city_id", "hour"],
        how="left"
    )

    df = df.merge(
        heat,
        left_on=["pickup_hex_id9", "city_id"],
        right_on=["msg.predictions.hexagon_id_9", "msg.city_id"],
        how="left"
    )

    df["x1_weighted_cost"] = (
        df["total_net_earnings"] *
        df["surge_multiplier_y"] *
        df["msg.predictions.predicted_std"]
    )

    df["score"] = df["total_net_earnings"]

    X = df[["x1_weighted_cost", "distance_km"]].to_numpy()
    y = df["score"].to_numpy()

    hex_ids = df["msg.predictions.hexagon_id_9"].to_numpy()
    # train 0.8 test 0.2
    X_train, X_test, y_train, y_test, hex_train, hex_test = train_test_split(
        X, y, hex_ids, test_size=0.2, random_state=42
    )
    return [X_train,X_test,y_train,y_test,hex_train,hex_test]

# y = theta1*weighted_cost + theta2*distance +bias
#score (predicted earning) = theta1 * earnings.total_net_earnings*ride_details.surge_multiplier*heat.msg.predictions.predicted_std + theta2*rides_details.distance_km
def get_params(X_train,y_train):
    model = LinearRegression()
    model.fit(X_train, y_train)
    print("theta1 =", model.coef_[0])
    print("theta2 =", model.coef_[1])
    print("Intercept =", model.intercept_)

    return([model.coef_[0],model.coef_[1],model.intercept_])

