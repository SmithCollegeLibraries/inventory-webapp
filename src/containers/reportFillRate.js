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
const NUMBER_OF_MONTHS = 18  // TODO: Get from settings

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
    currentView: TRAYS,
    changeView: (view) => set({ currentView: view }),
  };
});

const useCollections = create(
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
      name: 'report-fillrates-view',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

const ReportFillRate = () => {
  const state = useFillRates();
  const allSizes = useFillRates((state) => state.allSizes);
  const allCollections = useFillRates((state) => state.allCollections);
  const allViews = useFillRates((state) => state.allViews);
  const changeView = useFillRates((state) => state.changeView);
  // This is for toggling collections on and off, adjusting the totals
  const selectedCollections = useCollections((state) => state.selectedCollections);
  const setCollection = useCollections((state) => state.setCollection);
  const currentView = useFillRates((state) => state.currentView);

  useEffect(() => {
    async function fetchSubtotals() {
      async function ingestItems(itemApiPromise) {
        const itemApiBreakdown = await itemApiPromise;
        for (let i = 0; i < itemApiBreakdown.length; i++) {
          const month = formatMonth(itemApiBreakdown[i].year, itemApiBreakdown[i].month);
          const size = itemApiBreakdown[i].size;
          const collection = itemApiBreakdown[i].collection || UNASSIGNED_COLLECTION;
          const count = parseInt(itemApiBreakdown[i].count);

          if (!itemSubtotals[month][size][collection]) {
            itemSubtotals[month][size][collection] = 0;
          }
          itemSubtotals[month][size][collection] += count;

          if (!itemSubtotals[month][ALL_SIZES][collection]) {
            itemSubtotals[month][ALL_SIZES][collection] = 0;
          }
          itemSubtotals[month][ALL_SIZES][collection] += count;
        }
        useFillRates.setState({ itemSubtotals });
      }

      async function ingestTrays(trayApiPromise) {
        const trayApiBreakdown = await trayApiPromise;
        for (let i = 0; i < trayApiBreakdown.length; i++) {
          const month = formatMonth(trayApiBreakdown[i].year, trayApiBreakdown[i].month);
          const size = trayApiBreakdown[i].size;
          const collection = trayApiBreakdown[i].collection || UNASSIGNED_COLLECTION;
          const count = parseInt(trayApiBreakdown[i].count);

          if (!traySubtotals[month][size][collection]) {
            traySubtotals[month][size][collection] = 0;
          }
          traySubtotals[month][size][collection] += count;

          if (!traySubtotals[month][ALL_SIZES][collection]) {
            traySubtotals[month][ALL_SIZES][collection] = 0;
          }
          traySubtotals[month][ALL_SIZES][collection] += count;
        }
        useFillRates.setState({ traySubtotals });
      }

      async function ingestShelves(shelfApiPromise) {
        const shelfApiBreakdown = await shelfApiPromise;
        for (let i = 0; i < shelfApiBreakdown.length; i++) {
          const month = formatMonth(shelfApiBreakdown[i].year, shelfApiBreakdown[i].month);
          const size = shelfApiBreakdown[i].size;
          const collection = shelfApiBreakdown[i].collection || UNASSIGNED_COLLECTION;
          const count = parseInt(shelfApiBreakdown[i].count);

          if (!shelfSubtotals[month][size][collection]) {
            shelfSubtotals[month][size][collection] = 0;
          }
          shelfSubtotals[month][size][collection] += count;

          if (!shelfSubtotals[month][ALL_SIZES][collection]) {
            shelfSubtotals[month][ALL_SIZES][collection] = 0;
          }
          shelfSubtotals[month][ALL_SIZES][collection] += count;
        }
        useFillRates.setState({ shelfSubtotals });
      }

      let allCollections = await Load.getAllCollections();
      let allSizes = await Load.getAllSizes();

      // Add null and total size, as well as null collection
      allCollections.push({ code: UNASSIGNED_COLLECTION });
      allSizes.push({ code: null });
      allSizes.unshift({ code: ALL_SIZES });
      useFillRates.setState({ allCollections, allSizes });

      // If selectedCollections is not empty, check that any collections
      // that are not in selectedCollections are added to it, so that the
      // toggle buttons work properly. Also add Unassigned, which will
      // not show up in the collections list from the API!
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
      useCollections.setState({ selectedCollections });

      // Create a list of the past X months, including the current month,
      // using the format YYYY-MM
      let allMonths = [];
      let today = new Date();
      for (let i = 0; i <= NUMBER_OF_MONTHS; i++) {
        let month = new Date(today.getFullYear(), today.getMonth() - i, 1);
        allMonths.push(month.toISOString().slice(0, 7));
      }

      // Initialize empty 3D arrays by collection, month, size
      let shelfSubtotals = {};
      let traySubtotals = {};
      let itemSubtotals = {};
      // Add a bin for each month
      for (let i = 0; i < allMonths.length; i++) {
        shelfSubtotals[allMonths[i]] = {};
        traySubtotals[allMonths[i]] = {};
        itemSubtotals[allMonths[i]] = {};
        // Add a row for each size
        for (let j = 0; j < allSizes.length; j++) {
          shelfSubtotals[allMonths[i]][allSizes[j].code] = {};
          traySubtotals[allMonths[i]][allSizes[j].code] = {};
          itemSubtotals[allMonths[i]][allSizes[j].code] = {};
          // Add a column for each collection
          for (let k = 0; k < allCollections.length; k++) {
            shelfSubtotals[allMonths[i]][allSizes[j].code][allCollections[k].code] = 0;
            traySubtotals[allMonths[i]][allSizes[j].code][allCollections[k].code] = 0;
            itemSubtotals[allMonths[i]][allSizes[j].code][allCollections[k].code] = 0;
          }
        }
      }

      ingestItems(Load.itemFillRates(NUMBER_OF_MONTHS));
      ingestTrays(Load.trayFillRates(NUMBER_OF_MONTHS));
      ingestShelves(Load.shelfFillRates(NUMBER_OF_MONTHS));
    }

    fetchSubtotals();
  }, []);

  return (
    // Top bar of buttons that allow user to switch between views,
    // with the count of the current view in the upper right
    <div>
      <Row style={{"paddingTop": "20px", "paddingLeft": "15px", "paddingRight": "15px", "paddingBottom": "10px"}}>
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
      </Row>
      <Row>
        <Col md="10">
          <FillRates
            subtotals={currentView === ITEMS ? state.itemSubtotals : (currentView === TRAYS ? state.traySubtotals : state.shelfSubtotals)}
            allCollections={allCollections}
            allSizes={allSizes}
            selectedCollections={selectedCollections}
          />
        </Col>
        <Col md="2">
          <CollectionSelector
            selectedCollections={useCollections((state) => state.selectedCollections)}
            setCollection={setCollection}
            selectAllCollections={useCollections((state) => state.selectAllCollections)}
            clearSelectedCollections={useCollections((state) => state.clearSelectedCollections)}
          />
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
