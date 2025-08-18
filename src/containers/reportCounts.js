import React, { useEffect } from 'react';
import Load from '../util/load';
import { Row, Table, Button } from 'reactstrap';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware'

const LADDERS = 'Ladders';
const SHELVES = 'Shelves';
const TRAYS = 'Trays';
const ITEMS = 'Items';
const ALL_COLLECTIONS = 'Total';
const ALL_SIZES = 'Total';
const UNASSIGNED_COLLECTION = 'Unassigned';
const UNASSIGNED_SIZE = 'No size';

const inLadders = (shelfCount, shelvesPerLadder, asLadders=true) => {
  if (!asLadders || shelfCount === 0) {
    return shelfCount;
  }
  else {
    // Round down to a whole number, but if that would give 0 for
    // a non-zero shelf count, show "< 1 instead"
    return (
      Math.floor(shelfCount / shelvesPerLadder) >= 1
      ? Math.floor(shelfCount / shelvesPerLadder)
      : "< 1"
    );
  }
}


const useCounts = create((set, get) => {
  return {
    shelvesPerLadder: null,
    allSizes: {},
    allCollections: {},
    shelfTotal: 0,
    trayTotal: 0,
    itemTotal: 0,
    shelfSubtotals: {},
    traySubtotals: {},
    itemSubtotals: {},
    allViews: [SHELVES, TRAYS, ITEMS],
    totalCountText: (view) => {
      const state = get();
      if (view === LADDERS) {
        return `${inLadders(state.shelfTotal, state.shelvesPerLadder).toLocaleString()} ladders`;
      }
      else if (view === SHELVES) {
        return `${state.shelfTotal.toLocaleString()} shelves`;
      }
      else if (view === TRAYS) {
        return `${state.trayTotal.toLocaleString()} trays`;
      }
      else if (view === ITEMS) {
        return `${state.itemTotal.toLocaleString()} items`;
      }
    },
  };
});

const useViews = create(
  persist(
    (set, get) => ({
      defaultView: SHELVES,
      currentView: null,
      changeView: (view) => set({ currentView: view }),
    }),
    {
      name: 'report-counts-view',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

const ReportCounts = () => {
  const state = useCounts();
  const allSizes = useCounts((state) => state.allSizes);
  const allCollections = useCounts((state) => state.allCollections);
  const allViews = useCounts((state) => state.allViews);
  const changeView = useViews((state) => state.changeView);
  const currentView = useViews((state) => state.currentView ? state.currentView : state.defaultView);

  // Get the total number of shelves, trays, items via the API on load
  useEffect(() => {
    async function fetchTrayCount() {
      const shelfTotal = await Load.shelfCount();
      useCounts.setState({ shelfTotal });
      const ladderTotal = await Load.ladderCount();
      useCounts.setState({ shelvesPerLadder: shelfTotal / ladderTotal });
      const trayTotal = await Load.trayCount();
      useCounts.setState({ trayTotal });
      const itemTotal = await Load.itemCount();
      useCounts.setState({ itemTotal });
    }
    fetchTrayCount();
  }, []);

  // Get the count of each size in each collection on load and store the
  // count of each size in each collection in a 2D array
  useEffect(() => {
    async function fetchSubtotals() {
      async function ingestItemCounts(itemApiPromise, itemSubtotals) {
        // Go through each subtotal and set it in the state. In addition,
        // have the "total" size and collection be the sum of all the other
        // sizes and collections, including any nulls that don't exist in
        // any of the subtotals
        const itemApiBreakdown = await itemApiPromise;
        for (let i = 0; i < itemApiBreakdown.length; i++) {
          // If the collection is active, assign it to the relevant collection
          if (itemSubtotals[itemApiBreakdown[i].collection_code]) {
            itemSubtotals[itemApiBreakdown[i].collection_code][itemApiBreakdown[i].size] = parseInt(itemApiBreakdown[i].count);
            itemSubtotals[itemApiBreakdown[i].collection_code][ALL_SIZES] += parseInt(itemApiBreakdown[i].count);
          }
          // Otherwise, add it to the null/unassigned collection
          else {
            itemSubtotals[null][itemApiBreakdown[i].size] = parseInt(itemApiBreakdown[i].count);
            itemSubtotals[null][ALL_SIZES] += parseInt(itemApiBreakdown[i].count);
          }
          itemSubtotals[ALL_COLLECTIONS][itemApiBreakdown[i].size] += parseInt(itemApiBreakdown[i].count);
        }
        useCounts.setState({ itemSubtotals });
      }

      async function ingestTrayCounts(trayApiPromise, traySubtotals) {
        const trayApiBreakdown = await trayApiPromise;
        for (let i = 0; i < trayApiBreakdown.length; i++) {
          // If the collection is active, assign it to the relevant collection
          if (traySubtotals[trayApiBreakdown[i].collection_code]) {
            traySubtotals[trayApiBreakdown[i].collection_code][trayApiBreakdown[i].size] = parseInt(trayApiBreakdown[i].count);
            traySubtotals[trayApiBreakdown[i].collection_code][ALL_SIZES] += parseInt(trayApiBreakdown[i].count);
          }
          // Otherwise, add it to the null/unassigned collection
          else {
            traySubtotals[null][trayApiBreakdown[i].size] = parseInt(trayApiBreakdown[i].count);
            traySubtotals[null][ALL_SIZES] += parseInt(trayApiBreakdown[i].count);
          }
          traySubtotals[ALL_COLLECTIONS][trayApiBreakdown[i].size] += parseInt(trayApiBreakdown[i].count);
        }
        useCounts.setState({ traySubtotals });
      }

      async function ingestShelfCounts(shelfApiPromise, shelfSubtotals) {
        const shelfApiBreakdown = await shelfApiPromise;
        for (let i = 0; i < shelfApiBreakdown.length; i++) {
          // If the collection is active, assign it to the relevant collection
          if (shelfSubtotals[shelfApiBreakdown[i].collection_code]) {
            shelfSubtotals[shelfApiBreakdown[i].collection_code][shelfApiBreakdown[i].size] = parseInt(shelfApiBreakdown[i].count);
            shelfSubtotals[shelfApiBreakdown[i].collection_code][ALL_SIZES] += parseInt(shelfApiBreakdown[i].count);
          }
          // Otherwise, add it to the null/unassigned collection
          else {
            shelfSubtotals[null][shelfApiBreakdown[i].size] = parseInt(shelfApiBreakdown[i].count);
            shelfSubtotals[null][ALL_SIZES] += parseInt(shelfApiBreakdown[i].count);
          }
          shelfSubtotals[ALL_COLLECTIONS][shelfApiBreakdown[i].size] += parseInt(shelfApiBreakdown[i].count);
        }
        useCounts.setState({ shelfSubtotals });
      }

      let allCollections = await Load.getAllCollections();
      let allSizes = await Load.getAllSizes();
      let shelfApiPromise = Load.shelfCountsCollectionSize();
      let trayApiPromise = Load.trayCountsCollectionSize();
      let itemApiPromise = Load.itemCountsCollectionSize();

      // Add null and total collection and size
      allCollections.push({ code: null });
      allCollections.unshift({ code: ALL_COLLECTIONS });
      allSizes.push({ code: null });
      allSizes.unshift({ code: ALL_SIZES });
      useCounts.setState({ allCollections, allSizes });

      // Initialize an empty 2D array of shelf subtotals by collection and size
      let shelfSubtotals = {};
      let traySubtotals = {};
      let itemSubtotals = {};
      // Add a row for each collection
      for (let i = 0; i < allCollections.length; i++) {
        shelfSubtotals[allCollections[i].code] = {};
        traySubtotals[allCollections[i].code] = {};
        itemSubtotals[allCollections[i].code] = {};
        // Add a column for each size
        for (let j = 0; j < allSizes.length; j++) {
          shelfSubtotals[allCollections[i].code][allSizes[j].code] = 0;
          traySubtotals[allCollections[i].code][allSizes[j].code] = 0;
          itemSubtotals[allCollections[i].code][allSizes[j].code] = 0;
        }
      }

      ingestItemCounts(itemApiPromise, itemSubtotals);
      ingestTrayCounts(trayApiPromise, traySubtotals);
      ingestShelfCounts(shelfApiPromise, shelfSubtotals);
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
      { currentView === ITEMS
        ? <ItemCounts
          itemTotal={state.itemTotal}
          itemSubtotals={state.itemSubtotals}
          allCollections={allCollections}
          allSizes={allSizes}
        />
        : (
          currentView === TRAYS
          ? <TrayCounts
            trayTotal={state.trayTotal}
            traySubtotals={state.traySubtotals}
            allCollections={allCollections}
            allSizes={allSizes}
          />
          : <ShelfCounts
              shelfTotal={state.shelfTotal}
              shelfSubtotals={state.shelfSubtotals}
              allCollections={allCollections}
              allSizes={allSizes}
              shelvesPerLadder={state.shelvesPerLadder}
              inLadders={currentView === LADDERS}
            />
        )
      }
    </div>
  );
};

const ItemCounts = (props) => {
  return (
    JSON.stringify(props.itemSubtotals) === "{}"
    ?
      // TODO: try to get <Spinner> to work here
      <p>Loading…</p>
    :
    <Table style={{tableLayout: "fixed"}}>
      <thead>
        <tr>
          <th style={{width: "8em", textAlign: "right"}}></th>
          { Object.keys(props.allSizes).map((sizeIndex) => (
              <th key={`header-size-${sizeIndex}`} style={{width: `${100/props.allSizes.length}%`, textAlign: "right"}}>{props.allSizes[sizeIndex].code ?? UNASSIGNED_SIZE }</th>
          )) }
        </tr>
      </thead>
      <tbody>
        { Object.keys(props.allCollections).map((collectionIndex) =>
          <tr key={`row-collection-${collectionIndex}`}>
            <th key={`row-collection-${collectionIndex}`}>{props.allCollections[collectionIndex].code ?? UNASSIGNED_COLLECTION }</th>
            { Object.keys(props.allSizes).map((sizeIndex) => (
              <td key={`cell-${collectionIndex}-${sizeIndex}`}
                  style={{
                    textAlign: "right",
                    color: props.allCollections[collectionIndex].code === ALL_COLLECTIONS || props.allSizes[sizeIndex].code === ALL_SIZES
                      ? "#0d6efd"
                      : (
                        !props.itemSubtotals[props.allCollections[collectionIndex].code] || props.itemSubtotals[props.allCollections[collectionIndex].code][props.allSizes[sizeIndex].code] === 0
                        ? "#e9ecef"
                        : "black"
                      )
                  }}
              >
                { props.allCollections[collectionIndex].code === ALL_COLLECTIONS && props.allSizes[sizeIndex].code === ALL_SIZES
                  ? props.itemTotal.toLocaleString()
                  : (
                    props.itemSubtotals[props.allCollections[collectionIndex].code] && props.itemSubtotals[props.allCollections[collectionIndex].code][props.allSizes[sizeIndex].code]
                      ? props.itemSubtotals[props.allCollections[collectionIndex].code][props.allSizes[sizeIndex].code].toLocaleString()
                      : 0
                  )
                }
              </td>
            ))}
          </tr>
          )
        }
      </tbody>
    </Table>
  );
};

const TrayCounts = (props) => {
  return (
    JSON.stringify(props.traySubtotals) === "{}"
    ?
      // TODO: try to get <Spinner> to work here
      <p>Loading…</p>
    :
    <Table style={{tableLayout: "fixed"}}>
      <thead>
        <tr>
          <th style={{width: "8em", textAlign: "right"}}></th>
          { Object.keys(props.allSizes).map((sizeIndex) => (
              <th key={`header-size-${sizeIndex}`} style={{width: `${100/props.allSizes.length}%`, textAlign: "right"}}>{props.allSizes[sizeIndex].code ?? UNASSIGNED_SIZE }</th>
          )) }
        </tr>
      </thead>
      <tbody>
        { Object.keys(props.allCollections).map((collectionIndex) =>
          <tr key={`row-collection-${collectionIndex}`}>
            <th key={`row-collection-${collectionIndex}`}>{props.allCollections[collectionIndex].code ?? UNASSIGNED_COLLECTION }</th>
            { Object.keys(props.allSizes).map((sizeIndex) => (
              <td key={`cell-${collectionIndex}-${sizeIndex}`}
                  style={{
                    textAlign: "right",
                    color: props.allCollections[collectionIndex].code === ALL_COLLECTIONS || props.allSizes[sizeIndex].code === ALL_SIZES
                      ? "#0d6efd"
                      : (
                        !props.traySubtotals[props.allCollections[collectionIndex].code] || props.traySubtotals[props.allCollections[collectionIndex].code][props.allSizes[sizeIndex].code] === 0
                        ? "#e9ecef"
                        : "black"
                      )
                  }}
              >
                { props.allCollections[collectionIndex].code === ALL_COLLECTIONS && props.allSizes[sizeIndex].code === ALL_SIZES
                  ? props.trayTotal.toLocaleString()
                  : (
                    props.traySubtotals[props.allCollections[collectionIndex].code] && props.traySubtotals[props.allCollections[collectionIndex].code][props.allSizes[sizeIndex].code]
                      ? props.traySubtotals[props.allCollections[collectionIndex].code][props.allSizes[sizeIndex].code].toLocaleString()
                      : 0
                  )
                }
              </td>
            ))}
          </tr>
          )
        }
      </tbody>
    </Table>
  );
};

// ShelfCounts is used for ladder counts as well, which just use a fixed
// conversion ratio
const ShelfCounts = (props) => {
  return (
    JSON.stringify(props.traySubtotals) === "{}"
    ?
      // TODO: try to get <Spinner> to work here
      <p>Loading…</p>
    :
    <Table style={{tableLayout: "fixed"}}>
      <thead>
        <tr>
          <th style={{width: "8em", textAlign: "right"}}></th>
          { Object.keys(props.allSizes).map((sizeIndex) => (
              <th key={`header-size-${sizeIndex}`} style={{width: `${100/props.allSizes.length}%`, textAlign: "right"}}>{props.allSizes[sizeIndex].code ?? UNASSIGNED_SIZE }</th>
          )) }
        </tr>
      </thead>
      <tbody>
        { Object.keys(props.allCollections).map((collectionIndex) =>
          <tr key={`row-collection-${collectionIndex}`}>
            <th key={`row-collection-${collectionIndex}`}>{props.allCollections[collectionIndex].code ?? UNASSIGNED_COLLECTION }</th>
            { Object.keys(props.allSizes).map((sizeIndex) => (
              <td key={`cell-${collectionIndex}-${sizeIndex}`}
                  style={{
                    textAlign: "right",
                    color: props.allCollections[collectionIndex].code === ALL_COLLECTIONS || props.allSizes[sizeIndex].code === ALL_SIZES
                      ? "#0d6efd"
                      : (
                        !props.shelfSubtotals[props.allCollections[collectionIndex].code] || props.shelfSubtotals[props.allCollections[collectionIndex].code][props.allSizes[sizeIndex].code] === 0
                        ? "#e9ecef"
                        : (
                          props.inLadders && (props.shelfSubtotals[props.allCollections[collectionIndex].code][props.allSizes[sizeIndex].code] < props.shelvesPerLadder)
                          ? "#ced4da"
                          : "black"
                        )
                      )
                  }}
              >
                { props.allCollections[collectionIndex].code === ALL_COLLECTIONS && props.allSizes[sizeIndex].code === ALL_SIZES
                  ? inLadders(props.shelfTotal, props.shelvesPerLadder, props.inLadders)
                  : (
                    props.shelfSubtotals[props.allCollections[collectionIndex].code] && props.shelfSubtotals[props.allCollections[collectionIndex].code][props.allSizes[sizeIndex].code]
                      ? inLadders(props.shelfSubtotals[props.allCollections[collectionIndex].code][props.allSizes[sizeIndex].code], props.shelvesPerLadder, props.inLadders)
                      : 0
                  )
                }
              </td>
            ))}
          </tr>
          )
        }
      </tbody>
    </Table>
  );
};

export default ReportCounts;
