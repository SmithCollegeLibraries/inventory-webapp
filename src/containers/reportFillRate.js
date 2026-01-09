import React, { useEffect } from 'react';
import Load from '../util/load';
import { Row, Col, Table, Button } from 'reactstrap';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware'

const SHELVES = 'Shelves';
const TRAYS = 'Trays';
const ITEMS = 'Items';
const ALL_SIZES = 'Total';
const UNASSIGNED_COLLECTION = 'Unassigned';
const UNASSIGNED_SIZE = 'No size';
// Calculate the number of months from March 2023 to the current month
// -- this is when the webapp version of SIS was launched, and when
// the retraying project started.
const NUMBER_OF_MONTHS = (() => {
  const startYear = 2023;
  const startMonth = 3; // March (1-based)
  const today = new Date();
  const yearDiff = today.getFullYear() - startYear;
  const monthDiff = today.getMonth() + 1 - startMonth; // getMonth() is 0-based
  return yearDiff * 12 + monthDiff;
})();

const formatMonth = (year, month) => {
  return `${year}-${month.toString().padStart(2, '0')}`;
}


const useFillRates = create((set, get) => {
  return {
    allSizes: {},
    allCollections: {},
    shelfSubtotals: {},
    traySubtotals: {},
    itemSubtotals: {},
    allViews: [SHELVES, TRAYS, ITEMS],
  };
});

const useView = create(
  persist(
    (set, get) => ({
      currentView: TRAYS,
      changeView: (view) => set({ currentView: view }),
      selectedCollections: {},
      setCollection: (collection, toggle) => set((state) => {
        return {
          ...state,
          selectedCollections: {
            ...state.selectedCollections,
            [collection]: toggle
          }
        };
      }),
      selectAllCollections: () => set((state) => {
        let newSelectedCollections = { ...state.selectedCollections };
        // Iterate over newSelectedCollections and set all to true
        for (let collection in newSelectedCollections) {
          newSelectedCollections[collection] = true;
        }
        return {
          ...state,
          selectedCollections: newSelectedCollections,
        };
      }),
      clearSelectedCollections: () => set((state) => {
        let newSelectedCollections = { ...state.selectedCollections };
        // Iterate over newSelectedCollections and set all to false
        for (let collection in newSelectedCollections) {
          newSelectedCollections[collection] = false;
        }
        return {
          ...state,
          selectedCollections: newSelectedCollections,
        };
      }),
    }),
    {
      name: 'report-fill-rates',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

const handleCsvDownload = () => {
  const state = useFillRates.getState();
  const allSizes = state.allSizes;
  const allCollections = state.allCollections;
  const currentView = useView.getState().currentView;
  const selectedCollections = useView.getState().selectedCollections;
  const subtotals = currentView === ITEMS ? state.itemSubtotals : (currentView === TRAYS ? state.traySubtotals : state.shelfSubtotals);

  let csvContent = "data:text/csv;charset=utf-8,";

  // Create the header row
  let headerRow = ["Month"];
  for (let sizeIndex in allSizes) {
    headerRow.push(allSizes[sizeIndex].code ?? UNASSIGNED_SIZE);
  }
  csvContent += headerRow.join(",") + "\r\n";

  // Create the data rows
  for (let month in subtotals) {
    let dataRow = [month];
    for (let sizeIndex in allSizes) {
      let total = 0;
      for (let collection in selectedCollections) {
        if (selectedCollections[collection]) {
          total += subtotals[month][allSizes[sizeIndex].code][collection] || 0;
        }
      }
      dataRow.push(total);
    }
    csvContent += dataRow.join(",") + "\r\n";
  }

  // Encode and trigger the download
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `fill-rates-${currentView.toLowerCase()}-${new Date().toISOString().slice(0,10)}.csv`);
  document.body.appendChild(link); // Required for FF
  link.click();
  document.body.removeChild(link);
};

const ReportFillRate = () => {
  const state = useFillRates();
  const allSizes = useFillRates((state) => state.allSizes);
  const allCollections = useFillRates((state) => state.allCollections);
  const allViews = useFillRates((state) => state.allViews);
  const currentView = useView((state) => state.currentView);
  const changeView = useView((state) => state.changeView);
  // This is for toggling collections on and off, adjusting the totals
  const selectedCollections = useView((state) => state.selectedCollections);
  const setCollection = useView((state) => state.setCollection);

  useEffect(() => {
    async function fetchSubtotals() {
      async function ingestCounts(fillRatesPromise, itemSubtotals, traySubtotals, shelfSubtotals) {
        const fillRateBreakdown = await fillRatesPromise;
        for (let i = 0; i < fillRateBreakdown?.length; i++) {
          const yearMonth = formatMonth(fillRateBreakdown[i].year, fillRateBreakdown[i].month);
          const size = fillRateBreakdown[i].size_code;  // Null size is allowed
          const collection = fillRateBreakdown[i].collection_code || UNASSIGNED_COLLECTION;
          const itemCount = parseInt(fillRateBreakdown[i].item_count);
          const trayCount = parseInt(fillRateBreakdown[i].tray_count);
          const shelfCount = parseInt(fillRateBreakdown[i].shelf_count);

          // Add counts to the item subtotals
          if (!itemSubtotals[yearMonth][size][collection]) {
            itemSubtotals[yearMonth][size][collection] = 0;
          }
          itemSubtotals[yearMonth][size][collection] += itemCount ?? 0;
          if (!itemSubtotals[yearMonth][ALL_SIZES][collection]) {
            itemSubtotals[yearMonth][ALL_SIZES][collection] = 0;
          }
          itemSubtotals[yearMonth][ALL_SIZES][collection] += itemCount ?? 0;

          // Add counts to the tray subtotals
          if (!traySubtotals[yearMonth][size][collection]) {
            traySubtotals[yearMonth][size][collection] = 0;
          }
          traySubtotals[yearMonth][size][collection] += trayCount ?? 0;
          if (!traySubtotals[yearMonth][ALL_SIZES][collection]) {
            traySubtotals[yearMonth][ALL_SIZES][collection] = 0;
          }
          traySubtotals[yearMonth][ALL_SIZES][collection] += trayCount ?? 0;

          // Add counts to the shelf subtotals
          if (!shelfSubtotals[yearMonth][size][collection]) {
            shelfSubtotals[yearMonth][size][collection] = 0;
          }
          shelfSubtotals[yearMonth][size][collection] += shelfCount ?? 0;
          if (!shelfSubtotals[yearMonth][ALL_SIZES][collection]) {
            shelfSubtotals[yearMonth][ALL_SIZES][collection] = 0;
          }
          shelfSubtotals[yearMonth][ALL_SIZES][collection] += shelfCount ?? 0;
        }
        useFillRates.setState({ itemSubtotals, traySubtotals, shelfSubtotals });
      }

      let allCollections = await Load.getAllCollections();
      let allSizes = await Load.getAllSizes();
      let fillRatesPromise = Load.getFillRates(NUMBER_OF_MONTHS);

      // Add null and total size, as well as null collection
      allCollections.push({ code: UNASSIGNED_COLLECTION });
      allSizes.push({ code: null });
      allSizes.unshift({ code: ALL_SIZES });
      useFillRates.setState({ allCollections, allSizes });

      // If selectedCollections is not empty, check that any collections
      // that are not in selectedCollections are added to it, so that the
      // toggle buttons work properly.
      for (let i = 0; i < allCollections.length; i++) {
        if (selectedCollections[allCollections[i].code] === undefined) {
          selectedCollections[allCollections[i].code] = false;
        }
      }
      // If collections appear in selectedCollections that are not in
      // allCollections, remove them
      for (let collection in selectedCollections) {
        // Don't remove the null (unassigned) collection
        if (!allCollections.find((c) => c.code === collection)) {
          delete selectedCollections[collection];
        }
      }
      useView.setState({ selectedCollections });

      // Create a list of the past X months, including the current month,
      // using the format YYYY-MM
      let allMonths = [];
      let today = new Date();
      for (let i = 0; i <= NUMBER_OF_MONTHS; i++) {
        let month = new Date(today.getFullYear(), today.getMonth() - i, 1);
        allMonths.push(month.toISOString().slice(0, 7));
      }

      // Initialize empty 3D arrays by collection, month, size
      let itemSubtotals = {};
      let traySubtotals = {};
      let shelfSubtotals = {};
      // Add a bin for each month
      for (let i = 0; i < allMonths.length; i++) {
        itemSubtotals[allMonths[i]] = {};
        traySubtotals[allMonths[i]] = {};
        shelfSubtotals[allMonths[i]] = {};
        // Add a row for each size
        for (let j = 0; j < allSizes.length; j++) {
          itemSubtotals[allMonths[i]][allSizes[j].code] = {};
          traySubtotals[allMonths[i]][allSizes[j].code] = {};
          shelfSubtotals[allMonths[i]][allSizes[j].code] = {};
          // Add a column for each collection
          for (let k = 0; k < allCollections.length; k++) {
            itemSubtotals[allMonths[i]][allSizes[j].code][allCollections[k].code] = 0;
            traySubtotals[allMonths[i]][allSizes[j].code][allCollections[k].code] = 0;
            shelfSubtotals[allMonths[i]][allSizes[j].code][allCollections[k].code] = 0;
          }
        }
      }

      ingestCounts(fillRatesPromise, itemSubtotals, traySubtotals, shelfSubtotals);
    }

    fetchSubtotals();
  }, []);

  return (
    // Top bar of buttons that allow user to switch between views,
    // with the count of the current view in the upper right
    <div>
      <Row style={{"paddingTop": "20px", "paddingBottom": "10px"}}>
        <Col md="2">
          <CollectionSelector
            selectedCollections={useView((state) => state.selectedCollections)}
            setCollection={setCollection}
            selectAllCollections={useView((state) => state.selectAllCollections)}
            clearSelectedCollections={useView((state) => state.clearSelectedCollections)}
          />
        </Col>
        <Col md="10">
          <div style={{
            position: "absolute",
            top: 0,
            right: 0,
            zIndex: 2,
            paddingRight: "15px",
          }}>
            <Button
              color={"success"}
              style={{
                margin: "0",
              }}
              onClick={handleCsvDownload}
            >
              Download CSV
            </Button>
          </div>

          <h1 style={{
            position: "absolute",
            left: "50%",
            transform: "translateX(-50%)",
            top: 0,
            margin: 0,
            padding: 0,
            fontSize: "1.75rem",
            lineHeight: "2.25rem",
            zIndex: 1,
            pointerEvents: "none"
          }}>
            Fill rate
          </h1>

          <div style={{marginBottom:'10px'}}>
            {allViews.map((view) => (
              <Button
                key={view}
                onClick={() => changeView(view)}
                color={view === currentView ? 'primary' : 'secondary'}
                style={{marginRight: '8px'}}
              >
                {view}
              </Button>
            ))}
          </div>
          {(currentView === SHELVES && JSON.stringify(state.shelfSubtotals) === "{}")
            || (currentView === TRAYS && JSON.stringify(state.traySubtotals) === "{}")
            || (currentView === ITEMS && JSON.stringify(state.itemSubtotals) === "{}")
          ? "Loading..."
          : <FillRates
              subtotals={currentView === ITEMS ? state.itemSubtotals : (currentView === TRAYS ? state.traySubtotals : state.shelfSubtotals)}
              allCollections={allCollections}
              allSizes={allSizes}
              selectedCollections={selectedCollections}
            />
          }
        </Col>
      </Row>
    </div>
  );
};

const FillRates = (props) => {
  return (
    <Table style={{tableLayout: "fixed"}}>
      <thead>
        <tr>
          <th style={{width: "8em", textAlign: "right"}}></th>
          { Object.keys(props.allSizes).map((sizeIndex) => (
              <th key={`header-size-${sizeIndex}`} style={{width: `${100/props.allSizes.length}%`, textAlign: "right"}}>
                {props.allSizes[sizeIndex].code ?? UNASSIGNED_SIZE }
              </th>
          )) }
        </tr>
      </thead>
      <tbody>
        { Object.keys(props.subtotals).map((monthIndex) =>
          <tr key={`row-month-${monthIndex}`}>
            <th key={`row-month-${monthIndex}`}>{monthIndex}</th>
            { Object.keys(props.allSizes).map((sizeIndex) => {
              let total = 0;
              Object.keys(props.selectedCollections).forEach((collection) => {
                if (props.selectedCollections[collection]) {
                  total += props.subtotals[monthIndex][props.allSizes[sizeIndex].code][collection] || 0;
                }
              });
              return (
                <td key={`cell-${monthIndex}-${sizeIndex}`}
                    style={{
                      textAlign: "right",
                      color: props.allSizes[sizeIndex].code === ALL_SIZES
                        ? "#0d6efd"
                        : (
                          !total || total === 0
                          ? "#e9ecef"
                          : "black"
                        )
                    }}
                >
                  { total }
                </td>
              );
            })}
          </tr>
          )
        }
      </tbody>
    </Table>
  );
};

const CollectionSelector = (props) => {
  return (
    <div>
      <Button color="primary" onClick={props.selectAllCollections} style={{ marginBottom: '10px' }}>Select all</Button>
      <Button onClick={props.clearSelectedCollections} style={{ marginBottom: '10px', marginLeft: '10px' }}>Clear</Button>
      {Object.keys(props.selectedCollections).map((collectionIndex) => (
        <div key={`checkbox-${collectionIndex}`} className="form-check">
          <input
            type="checkbox"
            className="form-check-input"
            id={`checkbox-${collectionIndex}`}
            checked={props.selectedCollections[collectionIndex] || false}
            onChange={() => props.setCollection(collectionIndex, !props.selectedCollections[collectionIndex])}
          />
          <label className="form-check-label" htmlFor={`checkbox-${collectionIndex}`}>
            {collectionIndex}
          </label>
        </div>
      ))}
    </div>
  );
}

export default ReportFillRate;
