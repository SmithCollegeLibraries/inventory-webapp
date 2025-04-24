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

// The following constants represent the subtotal types from
// the API. It's possible the API will change; however, we need
// to calculate the percentage full on the fly, since percentages
// can't be added at the point of the API: collections can be
// selected by the user
const TOTAL_TRAYS_SUBTOTAL = "Total trays";
const CAPACITY_SUBTOTAL = "Capacity";
// This one is calculated on the fly
const SPACE_USED = "Space used";


const useSpaceUsage = create((set, get) => {
  return {
    allSizes: {},
    allCollections: {},
    shelfSubtotals: {},
    traySubtotals: {},
    itemSubtotals: {},
    allViews: [SHELVES]  // TODO: [SHELVES, TRAYS, ITEMS],
  };
});

const useView = create(
  persist(
    (set, get) => ({
      currentView: SHELVES,
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
      name: 'report-spaceusage-view',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

const ReportSpaceUsage = () => {
  const state = useSpaceUsage();
  const allSizes = useSpaceUsage((state) => state.allSizes);
  const allCollections = useSpaceUsage((state) => state.allCollections);
  const allViews = useSpaceUsage((state) => state.allViews);
  const currentView = useView((state) => state.currentView);
  const changeView = useView((state) => state.changeView);
  // This is for toggling collections on and off, adjusting the totals
  const selectedCollections = useView((state) => state.selectedCollections);
  const setCollection = useView((state) => state.setCollection);

  useEffect(() => {
    async function fetchSubtotals() {
      async function ingestCounts(spaceUsagePromise) {
        const spaceUsageBreakdown = await spaceUsagePromise;
        // Iterate through the space usage breakdown, which is nested:
        // { "ExampleCollection": { "ExampleSizeA": {"total_shelves": 2, "empty": 1, "full": 0, "partial": 1}, "ExampleSizeB": {"total_shelves": 1, "empty": 0, "full": 1, "partial": 0} } }
        // The outer key is the collection code, the inner key is the size code
        let shelfSubtotals = {};

        for (let collection in spaceUsageBreakdown) {
          const normalizedCollection = collection && collection !== "" ? collection : UNASSIGNED_COLLECTION;
          for (let size in spaceUsageBreakdown[collection]) {
            const normalizedSize = size && size !== "" ? size : UNASSIGNED_SIZE;
            for (let subtotal in spaceUsageBreakdown[collection][size]) {
              if (!shelfSubtotals[subtotal]) {
                shelfSubtotals[subtotal] = {};
              }
              if (!shelfSubtotals[subtotal][normalizedSize]) {
                shelfSubtotals[subtotal][normalizedSize] = {};
              }
              if (!shelfSubtotals[subtotal][ALL_SIZES]) {
                shelfSubtotals[subtotal][ALL_SIZES] = {};
              }
              if (!shelfSubtotals[subtotal][ALL_SIZES][normalizedCollection]) {
                shelfSubtotals[subtotal][ALL_SIZES][normalizedCollection] = 0;
              }
              const countToAdd = spaceUsageBreakdown[collection][size][subtotal];
              shelfSubtotals[subtotal][normalizedSize][normalizedCollection] = countToAdd;
              shelfSubtotals[subtotal][ALL_SIZES][normalizedCollection] += countToAdd;
            }
          }
        }

        useSpaceUsage.setState({ shelfSubtotals });
      }

      let allCollections = await Load.getAllCollections();
      let allSizes = await Load.getAllSizes();
      let spaceUsagePromise = Load.shelfSpaceUsage();

      // Add null and total size, as well as null collection
      allCollections.push({ code: UNASSIGNED_COLLECTION });
      allSizes.push({ code: UNASSIGNED_SIZE });
      allSizes.unshift({ code: ALL_SIZES });
      useSpaceUsage.setState({ allCollections, allSizes });

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

      ingestCounts(spaceUsagePromise);
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
          {(currentView === SHELVES && JSON.stringify(state.shelfSubtotals) === "{}")
            || (currentView === TRAYS && JSON.stringify(state.traySubtotals) === "{}")
            || (currentView === ITEMS && JSON.stringify(state.itemSubtotals) === "{}")
          ? "Loading..."
          : <SpaceUsage
              subtotals={currentView === ITEMS ? state.itemSubtotals : (currentView === TRAYS ? state.traySubtotals : state.shelfSubtotals)}
              allCollections={allCollections}
              allSizes={allSizes}
              selectedCollections={selectedCollections}
            />
          }
        </Col>
        <Col md="2">
          <CollectionSelector
            selectedCollections={useView((state) => state.selectedCollections)}
            setCollection={setCollection}
            selectAllCollections={useView((state) => state.selectAllCollections)}
            clearSelectedCollections={useView((state) => state.clearSelectedCollections)}
          />
        </Col>
      </Row>
    </div>
  );
};

const SpaceUsage = (props) => {
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
        { Object.keys(props.subtotals).map((subtotal) =>
          <tr key={`row-month-${subtotal}`}>
            {/* If it's "Total trays", omit; if "Capacity", calculate */}
            { subtotal === TOTAL_TRAYS_SUBTOTAL
              ? null
              : subtotal === CAPACITY_SUBTOTAL
                ? <th key={`row-month-${SPACE_USED}`}>{SPACE_USED}</th>
                : <th key={`row-month-${subtotal}`}>{subtotal}</th>
            }

            { Object.keys(props.allSizes).map((sizeIndex) => {
              let total = 0;
              let tray_total = 0;
              let capacity_total = 0;
              if (subtotal === TOTAL_TRAYS_SUBTOTAL) {
                return null;
              }
              else if (subtotal === CAPACITY_SUBTOTAL) {
                // If it's for "all sizes", return null because that can't
                // be calculated for oversize, etc.
                if (props.allSizes[sizeIndex].code === ALL_SIZES) {
                  total = null;
                }
                else {
                  // Otherwise, calculate from total trays and capacity
                  Object.keys(props.selectedCollections).forEach((collection) => {
                    if (props.selectedCollections[collection]) {
                      tray_total += props.subtotals[TOTAL_TRAYS_SUBTOTAL]?.[props.allSizes[sizeIndex].code]?.[collection] || 0;
                    }
                  });
                  Object.keys(props.selectedCollections).forEach((collection) => {
                    if (props.selectedCollections[collection]) {
                      capacity_total += props.subtotals[CAPACITY_SUBTOTAL]?.[props.allSizes[sizeIndex].code]?.[collection] || 0;
                    }
                  });
                  // Assume it's unreliable if capacity is undefined, or
                  // if the total trays significantly exceeds the capacity
                  total = capacity_total && tray_total / capacity_total < 1.15 ? Math.round((tray_total / capacity_total) * 100) : null;
                }
              }
              else {
                Object.keys(props.selectedCollections).forEach((collection) => {
                  if (props.selectedCollections[collection]) {
                    total += props.subtotals[subtotal]?.[props.allSizes[sizeIndex].code]?.[collection] || 0;
                  }
                });
              }
                return (
                <td key={`cell-${subtotal}-${sizeIndex}`}
                  style={{
                  textAlign: "right",
                  position: "relative",
                  color: props.allSizes[sizeIndex].code === ALL_SIZES
                      ? "#0d6efd"
                      : (
                      !total || total === 0
                      ? "#e9ecef"
                      : "black"
                      )
                    }
                  }
                >
                  {subtotal === CAPACITY_SUBTOTAL && total !== null && (
                  <span style={{
                    position: "absolute",
                    right: "-0.5ex",
                    color: "black"
                  }}>%</span>
                  )}
                  { total ?? "N/A" }
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

export default ReportSpaceUsage;
