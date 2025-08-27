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
const LABEL_TRAYS = "Total trays";
const LABEL_CAPACITY = "Capacity";
const LABEL_SHELVES = "Shelves";
const LABEL_PARTIAL = "Partial/full";
const LABEL_FULL = "Full";
// These are calculated on the fly
const SHELVES_TOTAL = "Shelves (total)";
const SHELVES_SELECTED = "Shelves (selected)"; // This is just an alias for LABEL_SHELVES
const SPACE_USED = "Space used (of selected)";
const SPACE_USED_ALL = "Space used (of total)";

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

        // These are the calculated ones we want at the top of the list
        let shelfSubtotals = {[SHELVES_TOTAL]: {}, [LABEL_SHELVES]: {}, [SPACE_USED_ALL]: {}, [SPACE_USED]: {}};

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
      // Turn off unassigned size information: there aren't any shelves
      // without sizes except for pseudo-shelves which shouldn't be counted
      // allSizes.push({ code: UNASSIGNED_SIZE });
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
      <p style={{fontStyle: "italic", maxWidth: "800px"}}>
        * Shelves with trays of nonstandard size do not have a defined capacity.
        For the starred columns, space used is calculated simply as the percentage
        of (partially or fully) used shelves divided by the total number of shelves.
        Percentages for other columns are calculated based on the actual amount
        of free space.
      </p>
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
        { console.log(props.subtotals) || Object.keys(props.subtotals).map((subtotal) =>
          // Hide the built-in totals for trays and capacity, since they
          // only used for calculating percentages
          (subtotal === LABEL_TRAYS || subtotal === LABEL_CAPACITY) ? null :
          <tr key={`row-month-${subtotal}`}>
            {/* Change label for shelves to "Shelves (selected)" */}
            { subtotal === LABEL_SHELVES
              ? <th key={`row-month-${SHELVES_SELECTED}`}>{SHELVES_SELECTED}</th>
              : <th key={`row-month-${subtotal}`}>{subtotal}</th>
            }

            { Object.keys(props.allSizes).map((sizeIndex) => {
              let total = 0;
              let roughTotal = false;
              let trayTotal = 0;
              let capacitySelected = 0;
              let capacityAll = 0;
              let usedShelves = 0;
              let shelvesSelected = 0;
              let shelvesAll = 0;

              if (subtotal === SHELVES_TOTAL) {
                // Get total shelves for all collections, not just selected ones.
                // Should be same as SHELVES_SELECTED if all collections are selected.
                Object.keys(props.selectedCollections).forEach((collection) => {
                  total += props.subtotals[LABEL_SHELVES]?.[props.allSizes[sizeIndex].code]?.[collection] || 0;
                });
              }

              // Use these two subtotals as placeholders for giving a percentage.
              // Total Trays will have the total percentage against the entire facility,
              // and Capacity will have the percentage against the selected collections.
              else if (subtotal === SPACE_USED || subtotal === SPACE_USED_ALL) {
                Object.keys(props.selectedCollections).forEach((collection) => {
                  if (props.selectedCollections[collection]) {
                    trayTotal += props.subtotals[LABEL_TRAYS]?.[props.allSizes[sizeIndex].code]?.[collection] || 0;
                    if (capacitySelected !== null) {
                      if (props.subtotals[LABEL_CAPACITY]?.[props.allSizes[sizeIndex].code]?.[collection] === null) {
                        capacitySelected = null;
                      }
                      else if (capacitySelected !== null) {
                        capacitySelected += props.subtotals[LABEL_CAPACITY]?.[props.allSizes[sizeIndex].code]?.[collection];
                      }
                    }
                    usedShelves += props.subtotals[LABEL_FULL]?.[props.allSizes[sizeIndex].code]?.[collection] || 0;
                    usedShelves += props.subtotals[LABEL_PARTIAL]?.[props.allSizes[sizeIndex].code]?.[collection] || 0;
                    shelvesSelected += props.subtotals[LABEL_SHELVES]?.[props.allSizes[sizeIndex].code]?.[collection] || 0;
                  }
                  if (capacityAll !== null) {
                    if (props.subtotals[LABEL_CAPACITY]?.[props.allSizes[sizeIndex].code]?.[collection] === null) {
                      capacityAll = null;
                    }
                    else if (capacityAll !== null) {
                      capacityAll += props.subtotals[LABEL_CAPACITY]?.[props.allSizes[sizeIndex].code]?.[collection];
                    }
                  }
                  shelvesAll += props.subtotals[LABEL_SHELVES]?.[props.allSizes[sizeIndex].code]?.[collection] || 0;
                });
                // Assume it's unreliable if capacity is undefined, or if the total trays
                // significantly exceeds the capacity. In this case, calculate the number
                // of partial/full (and full, if any) shelves divided by the total number of shelves.
                console.log(capacitySelected, props.allSizes[sizeIndex].code);
                if (props.allSizes[sizeIndex].code === ALL_SIZES
                    || !capacitySelected
                    || trayTotal > capacitySelected * 1.15) {
                  let denominator = subtotal === SPACE_USED_ALL ? shelvesAll : shelvesSelected;
                  if (denominator === 0) { total = null; }
                  else {
                    total = Math.round((usedShelves / denominator) * 100);
                  }
                  roughTotal = true;
                }
                else {
                  let denominator = subtotal === SPACE_USED_ALL ? capacityAll : capacitySelected;
                  if (denominator === 0) { total = null; }
                  else {
                    total = Math.round((trayTotal / denominator) * 100);
                  }
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
                  height: "9ex",
                  color: props.allSizes[sizeIndex].code === ALL_SIZES
                    ? "#0d6efd"
                    : (
                    !total || total === 0
                    ? "#e9ecef"
                    : "black"
                    )
                  }}
                >
                  {(subtotal === SPACE_USED || subtotal === SPACE_USED_ALL) &&
                  total !== null &&
                  (<>
                    <span style={{
                      position: "absolute",
                      right: "-0.5ex",
                      textAlign: "left",
                    }}>%</span>
                    <span style={{
                      position: "absolute",
                      right: "-1.5ex",
                      textAlign: "left",
                    }}>{ roughTotal ? "*" : "" }</span>
                  </>)}
                  { total ?? "-" }
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
