import "./App.css";

import freeGames from "./data/freeGamesList.json";

import {
  createRows
} from './data/processing/rows';

import React, { useState, useEffect } from "react";
import { DataGrid } from "@mui/x-data-grid";

function App() {
  const columns = [
    {
      field: "name",
      headerName: "Name",
      minWidth: 180,
      flex: 3,
      type: "string",

      renderCell: (params) => {
        // console.warn('25', params)
        return <a href={params.row.name.href}>{params.row.name.name}</a>
      },

    },
    {
      field: "metaScore",
      headerName: "Meta Score",
      type: "string",
      minWidth: 90,
      flex: 1,
    },
    {
      field: "userScore",
      headerName: "User Score",
      type: "string",
      minWidth: 90,
      flex: 1,
    },
    {
      field: "multipliedScore",
      headerName: "Multiplied Score",
      type: "string",
      minWidth: 120,
      flex: 2,
    },
    {
      field: "date",
      headerName: "Date",
      type: "string",
      flex: 3,
      minWidth: 120,
    },
  ];

  const [rows, setRows] = useState(createRows(freeGames));

  useEffect(() => {

    if (!process.env.NODE_ENV || process.env.NODE_ENV === 'development') {
      return console.warn('DEV mode using local game list')

    }

    fetch('https://raw.githubusercontent.com/JZ6/RatingEpicGames/main/src/data/freeGamesList.json')
      .then(data => data.json())
      .then(json => setRows(createRows(json)))
      .catch(console.error);

  }, [])

  // console.warn("17", freeGames);


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
        <div style={{ height: "90vh", minWidth: '80vw' }}>
          <DataGrid rows={rows} columns={columns} pageSize={100}
            initialState={{
              sorting: {
                sortModel: [{ field: 'date', sort: 'desc' }],
              },
            }} />
        </div>
      </div>
    </div>
  );
}

export default App;
