import React from "react";

export default function About() {
  return (
    <div
      style={{
        padding: "20px",
        fontFamily: "Arial, sans-serif",
        color: "white",
        backgroundColor: "#111",
        minHeight: "90vh",
      }}>
      <h1>About</h1>
      <p>
        This website aims to visualize the Linear Regression Model which our
        team developed during this hackathon.
      </p>
      <p>
        By Performing an 80-20 train-test split on the csv data we trained an ML
        model to generate a score for each hexagonal grid cell for our test
        data. These scores indicate the earning potential of a driver in those
        areas.
      </p>
      <p>
        It goes without saying that a higher score indicates better earning
        potential which is indicated by the green hexagons, while the red
        hexagons indicate lower earning potential and yellow acts as the middle
        ground.
      </p>

      <p>
        Now it may not always be feasible for a rider in one city to travel to a
        hexagon in a different city just because it has a better score, which is
        why by clicking the map we take into account the current location of the
        rider and adjust the scores accordingly.
      </p>
      <p>
        Due to the training set being small our model was able to achieve an R^2
        of around 0.68 and an RMSE of 2.85 when comparing our predictions with
        the actual earning potential of a hexagon, which for a proof concept
        with limited data and features is not too bad.
      </p>
      <p>
        Potential improvements with more data could be adding more features
        which take into account the wellness of a driver as well as their
        personal preferences. Real time updating of data could also be
        interesting to look at.
      </p>
    </div>
  );
}
