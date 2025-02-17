import React, { useReducer, useEffect } from 'react';
import Load from '../util/load';
import { Row, Table, Button } from 'reactstrap';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware'

const LADDERS = 'Ladders';
const SHELVES = 'Shelves';
const TRAYS = 'Trays';
const ITEMS = 'Items';
const TOTAL = 'Total';


const useCounts = create((set) => {
  return {
    // settings: {},
    shelvesPerLadder: null,
    allSizes: {},
    allCollections: {},
    shelfTotal: 100000, // TODO: fix this
    trayTotal: null,
    itemTotal: null,
    shelfSubtotals: {},
    traySubtotals: {},
    itemSubtotals: {},
    setSizes: (allSizes) => set({ allSizes }),
    setCollections: (allCollections) => set({ allCollections }),
    setShelfTotal: (total) => set({ total }),
    setShelfSubtotal: (collection, size, count) => set((state) => {
      let shelfSubtotals = { ...state.shelfSubtotals };
      if (!shelfSubtotals[collection]) {
        shelfSubtotals[collection] = {};
      }
      shelfSubtotals[collection][size] = count;
      return { shelfSubtotals };
    }),
    setTrayTotal: (total) => set({ total }),
    setTraySubtotal: (collection, size, count) => set((state) => {
      let traySubtotals = { ...state.traySubtotals };
      if (!traySubtotals[collection]) {
        traySubtotals[collection] = {};
      }
      traySubtotals[collection][size] = count;
      return { traySubtotals };
    }),
    setItemTotal: (total) => set({ total }),
    setItemSubtotal: (collection, size, count) => set((state) => {
      let itemSubtotals = { ...state.itemSubtotals };
      if (!itemSubtotals[collection]) {
        itemSubtotals[collection] = {};
      }
      itemSubtotals[collection][size] = count;
      return { itemSubtotals };
    }),
    totalCountText: (state, view) => {
      if (view === LADDERS) {
        return `${Math.floor(state.shelfTotal / state.shelvesPerLadder)} ladders`;
      }
      else if (view === SHELVES) {
        return `${state.shelfTotal} shelves`;
      }
      else if (view === TRAYS) {
        return `${state.trayTotal} trays`;
      }
      else if (view === ITEMS) {
        return `${state.itemTotal} items`;
      }
    },
  };
});

const useViews = create(
  persist(
    (set, get) => ({
      allViews: [LADDERS, SHELVES, TRAYS, ITEMS],
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
  const allViews = useViews((state) => state.allViews);
  const changeView = useViews((state) => state.changeView);
  const currentView = useViews((state) => state.currentView ? state.currentView : state.defaultView);

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
        <Button color="info" onClick={() => {navigator.clipboard.writeText(state.totalCountText(state, currentView))}} style={{"cursor": "grab", "marginLeft": "auto"}}>{`${state.totalCountText(state, currentView)} total`}</Button>
      </Row>
      <ShelfCounts
        shelfSubtotals={state.shelfSubtotals}
        allCollections={allCollections}
        allSizes={allSizes}
      />
    </div>
  );
};

const ShelfCounts = (props) => {
  // Get settings from database on load
  // useEffect(() => {
  //   const getSettings = async () => {
  //     const settings = await Load.getAllSettings();
  //     useCounts.setState({ settings });
  //   };
  //   getSettings();
  // }, []);

  // Get the total number of shelves, trays, items via the API on load
  useEffect(() => {
    async function fetchTrayCount() {
      // Get the ladder of count in order to set shelves per latter
      const shelfTotal = await Load.shelfCount();
      if (shelfTotal) {
        useCounts.setState({ shelfTotal });
      }
      const ladder = await Load.ladderCount();
      if (ladder) {
        useCounts.setState({ shelvesPerLadder: shelfTotal / ladder });
      }
      const trayTotal = await Load.trayCount();
      if (trayTotal) {
        useCounts.setState({ trayTotal });
      }
      const itemTotal = await Load.itemCount();
      if (itemTotal) {
        useCounts.setState({ itemTotal });
    }
  }
    fetchTrayCount();
  }, []);

  // Get the count of each size in each collection on load
  // The results of the call to Load.shelfCountCollectionSize() will look like this:
  // {
  //   "collection_id": 1,
  //   "size_id": null,
  //   "collection_code": "Smith GC",
  //   "collection_name": "Smith General Collection",
  //   "size": null,
  //   "count": 31
  // },
  // {
  //     "collection_id": 1,
  //     "size_id": 1,
  //     "collection_code": "Smith GC",
  //     "collection_name": "Smith General Collection",
  //     "size": "AL",
  //     "count": 19
  // },
  // We want to store the count of each size in each collection in a 2D array
  useEffect(() => {
    async function fetchShelfSubtotals() {
      const allCollections = await Load.getAllCollections();
      const allSizes = await Load.getAllSizes();
      useCounts.setState({ allCollections: [{ code: TOTAL }, ...allCollections] });
      useCounts.setState({ allSizes: [{ code: TOTAL }, ...allSizes] });

      const subtotalsFromApi = await Load.shelfCountsCollectionSize();
      // Initialize an empty 2D array of shelf subtotals by collection and size
      let shelfSubtotals = {};
      // Add a row for each collection
      for (let i = 0; i < allCollections.length; i++) {
        shelfSubtotals[allCollections[i].code] = {};
        // Add a column for each size
        for (let j = 0; j < allSizes.length; j++) {
          shelfSubtotals[allCollections[i].code][allSizes[j].code] = 0;
        }
      }
      // Go through each subtotal and set it in the state
      for (let i = 0; i < subtotalsFromApi.length; i++) {
        shelfSubtotals[subtotalsFromApi[i].collection_code][subtotalsFromApi[i].size] = subtotalsFromApi[i].count;
      }
      useCounts.setState({ shelfSubtotals });
    }
    fetchShelfSubtotals();
  }, []);

  return (
    <Table style={{tableLayout: "fixed"}}>
      <thead>
        <tr>
          <th style={{width: "8em", textAlign: "center"}}></th>
          {Object.keys(props.allSizes).map((sizeIndex) => (
            <th key={`header-size-${sizeIndex}`} style={{width: `${100/props.allSizes.length + 2}%`, textAlign: "center"}}>{props.allSizes[sizeIndex].code}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Object.keys(props.allCollections).map((collectionIndex) =>
          <tr key={`row-collection-${collectionIndex}`}>
            <th key={`row-collection-${collectionIndex}`}>{props.allCollections[collectionIndex].code}</th>
          </tr>
          )
        }
      </tbody>
    </Table>
  );
};

export default ReportCounts;
