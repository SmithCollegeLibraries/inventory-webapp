import React, { useEffect } from 'react';
import Load from '../util/load';
import { Row, Col, Table, Button } from 'reactstrap';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware'

const UNASSIGNED_COLLECTION = 'Unassigned';
const START_DATE = "2023-07";

// TODO: Get these status from the actual data that's returned
const REQUEST_STATUSES = {
  "Picklist: Requested": "Requested",
  "Circulated": "Circulated",
  "Marked missing": "Missing",
};

const useRequestHistory = create((set, get) => {
  return {
    allCollections: {},
    requestCounts: {},
  };
});

const useView = create(
  persist(
    (set, get) => ({
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
      name: 'report-request-history',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

const handleCsvDownload = async () => {
  const state = useRequestHistory.getState();
  const allCollections = state.allCollections;
  const requestCounts = state.requestCounts;
  const selectedCollections = useView.getState().selectedCollections;

  // The CSV download should have the same data as shown in the table,
  // based on the collections selected by the user.
  // PLEASE NOTE that this calculates everything from scratch, so any
  // updates to the HTML display should also be made here.

  // Create CSV header row
  let csvContent = "Month";
  Object.values(REQUEST_STATUSES).forEach((status) => {
    csvContent += `,${status}`;
  });
  csvContent += "\n";

  // Create CSV rows for each month
  Object.keys(requestCounts)
    // There are very few circulations before July 2023, so hide those
    .filter((month) => month >= START_DATE)
    .forEach((month) => {
      let row = `${month}`;
      Object.values(REQUEST_STATUSES).forEach((status) => {
        row += `,${requestCounts[month][status]}`;
      });
      csvContent += row + "\n";
    });

  // Create a download link and click it
  const encodedUri = encodeURI(`data:text/csv;charset=utf-8,${csvContent}`);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  const dateStr = new Date().toISOString().slice(0,10);
  link.setAttribute("download", `request-history-report-${dateStr}.csv`);
  document.body.appendChild(link); // Required for FF

  link.click();
};

const ReportRequestHistory = () => {
  const state = useRequestHistory();
  const allCollections = useRequestHistory((state) => state.allCollections);
  // This is for toggling collections on and off, adjusting the totals
  const selectedCollections = useView((state) => state.selectedCollections);
  const setCollection = useView((state) => state.setCollection);

  useEffect(() => {
    async function fetchRequestCounts() {
      async function ingestCounts(requestHistoryPromise) {
        const requestHistoryBreakdown = await requestHistoryPromise;

        // We also want to make sure that all months since the first
        // month are included, even if there are no requests in that month.
        // Initialize by giving an empty object to each month in the range
        let requestCounts = {};
        let firstMonth = new Date(requestHistoryBreakdown[0].year, requestHistoryBreakdown[0].month - 1);
        // let firstMonth = START_DATE;
        let currentMonth = new Date();
        while (currentMonth >= firstMonth) {
          const year = currentMonth.getFullYear();
          const month = String(currentMonth.getMonth() + 1).padStart(2, '0');
          requestCounts[`${year}-${month}`] = Object.values(REQUEST_STATUSES).reduce((acc, status) => {
            acc[status] = 0;
            return acc;
          }, {});

          // Move to the previous month
          currentMonth.setMonth(currentMonth.getMonth() - 1);
        }

        // For each entry in the request history, add it to the
        // appropriate month by collection. There should be only
        // one entry per month/action/collection.
        requestHistoryBreakdown.forEach((entry) => {
          const year = entry.year;
          const month = String(entry.month).padStart(2, '0');
          const collection = entry.collection_code || UNASSIGNED_COLLECTION;
          const status = REQUEST_STATUSES[entry.action] || entry.status;

          // If the collection is not in selectedCollections, skip it
          if (!selectedCollections[collection]) {
            return;
          }
          if (requestCounts[`${year}-${month}`][status] === undefined) {
            // Add the status to the requestCounts object
            requestCounts[`${year}-${month}`][status] = 0;
          }
          requestCounts[`${year}-${month}`][status] += parseInt(entry.count, 10) || 0;
        });

        useRequestHistory.setState({ requestCounts });
      }

      let allCollections = await Load.getAllCollections();
      let requestHistoryPromise = Load.getRequestHistory();

      // Add null collection
      allCollections.push({ code: UNASSIGNED_COLLECTION });
      useRequestHistory.setState({ allCollections });

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

      ingestCounts(requestHistoryPromise);
    }

    fetchRequestCounts();
  }, [selectedCollections]);

  return (
    // Top bar of buttons that allow user to switch between views,
    // with the count of the current view in the upper right
    <div inline style={{"float": "left", "width": "100%", "position": "relative"}}>
      <div style={{
        position: "absolute",
        top: "20px",
        right: 0,
        zIndex: 2
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
      <Row style={{"paddingTop": "10px", "paddingLeft": "15px", "paddingRight": "15px", "paddingBottom": "10px"}}>
      </Row>
      <Row>
        <Col md="2">
          <CollectionSelector
            selectedCollections={useView((state) => state.selectedCollections)}
            setCollection={setCollection}
            selectAllCollections={useView((state) => state.selectAllCollections)}
            clearSelectedCollections={useView((state) => state.clearSelectedCollections)}
          />
        </Col>
        <Col md="10">
          {JSON.stringify(state.requestCounts) === "{}"
          ? "Loading..."
          : <RequestHistory
              allCollections={allCollections}
              selectedCollections={selectedCollections}
              requestCounts={state.requestCounts}
            />
          }
        </Col>
      </Row>
    </div>
  );
};

const RequestHistory = (props) => {
  return (
    <Table style={{width: "28em", tableLayout: "fixed"}}>
      <thead>
        <tr>
          <th style={{width: "8em", textAlign: "right"}}></th>
          {Object.values(REQUEST_STATUSES).map((status) => (
            <th key={`header-${status}`} style={{ width: "8em", textAlign: "right" }}>
              {status}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        { Object.keys(props.requestCounts)
          // There are very few circulations before July 2023, so hide those
          .filter((month) => month >= START_DATE)
          .map((month) =>
            <tr key={`row-${month}`}>
              <th key={`row-${month}-label`}>{month}</th>
              {Object.values(REQUEST_STATUSES).map((status) => (
                <td key={`cell-${month}-${status}`} style={{ textAlign: "right" }}>
                  { props.requestCounts[month][status] }
                </td>
              ))}
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

export default ReportRequestHistory;
