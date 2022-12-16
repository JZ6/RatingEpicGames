import "./App.css";
import logo from "./coffeeDonation.png";

import freeGames from "./data/freeGamesList.json";

import {
  createRows
} from './data/processing/rows';

import React, { useState, useEffect } from "react";
import { DataGrid, GridToolbar } from "@mui/x-data-grid";

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

      valueGetter: (params) => params.row.name.name

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
      .then(() => console.log('Fetched game list from Github 1.1.0'))
      .catch(console.error);

  }, [])

  // console.warn("17", freeGames);

  const [showDonationHover, setShowDonationHover] = useState(false);

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
          <DataGrid
            rows={rows}
            columns={columns}
            pageSize={100}
            // disableColumnFilter
            // disableColumnSelector
            // disableDensitySelector
            initialState={{
              sorting: {
                sortModel: [{ field: 'date', sort: 'desc' }],
              },
            }}
            components={{ Toolbar: GridToolbar }}
            componentsProps={{
              toolbar: {
                showQuickFilter: true,
                quickFilterProps: { debounceMs: 500 },
              },
            }}
          />
        </div>
      </div>
      <div className="Donation-button">
        {showDonationHover && (
          <div className="Donation-hover-text">
            Buy me a coffee!
          </div>
        )}
        <a href="https://www.paypal.com/donate/?business=U976MSQAHRS62&no_recurring=0&item_name=Developing+%22Rating+Epic+Games%22+for+you%21&currency_code=CAD">
          <img src={logo}
            onMouseEnter={() => setShowDonationHover(true)}
            onMouseLeave={() => setShowDonationHover(false)}
            className='Donation-coffee-pic'
            alt="<a href='https://pngtree.com/so/coffee'>coffee png from pngtree.com/</a>">
          </img>
        </a>
      </div>
    </div>
  );
}

export default App;
