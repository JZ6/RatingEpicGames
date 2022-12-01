import logo from "./logo.svg";
import "./App.css";

import freeGames from "./freeGamesList.json";

import React, { useState, useEffect } from "react";
import { DataGrid, GridColDef, GridValueGetterParams } from "@mui/x-data-grid";

function App() {
  // const [gameReviews, setGameReviews] = useState(initGameReviews);

  // console.warn("17", freeGames);

  const columns = [
    { field: "id", headerName: "Name", minWidth: 360 },
    {
      field: "metaScore",
      headerName: "Meta Score",
      type: "number",
      minWidth: 120,
    },
    {
      field: "userScore",
      headerName: "User Score",
      type: "number",
      minWidth: 120,
    },
    {
      field: "multipliedScore",
      headerName: "Multiplied Score",
      type: "number",
      minWidth: 180,
    },
    {
      field: "date",
      headerName: "Date",
      type: "string",
      minWidth: 360,
    },
  ];

  // freeGames.map((game) => {
  //   console.warn("30", game);
  // });

  const rows = Object.entries(freeGames).map(
    ([id, { name, metaScore, userScore, startDates }]) => {
      // console.warn("35", id, fields);

      const multipliedScore = metaScore * userScore;

      const href = `http://www.metacritic.com/game/pc/${id}`;

      return {
        id: name,
        metaScore: metaScore == "N/A" ? "" : metaScore,
        userScore: userScore == "N/A" ? "" : userScore,
        multipliedScore: isNaN(multipliedScore)
          ? ""
          : Math.round(multipliedScore),
        date: startDates.join(", "),
      };
    }
  );

  // console.warn("45", rows);

  return (
    <div className="App">
      <header className="App-header">Rating Epic Games</header>{" "}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          // height: "90vh",
        }}
      >
        <div style={{ height: "90vh", minWidth: 1800 }}>
          <DataGrid rows={rows} columns={columns} pageSize={100} />
        </div>
      </div>
    </div>
  );
}

export default App;
