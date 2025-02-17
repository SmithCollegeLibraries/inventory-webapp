import React, { useReducer, useEffect } from 'react';
import Load from '../util/load';
import { Row, Table, Button } from 'reactstrap';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware'

const LADDERS = 'Ladders';
const SHELVES = 'Shelves';
const TRAYS = 'Trays';
const ITEMS = 'Items';


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

  // Get list of active collections from database on load
  useEffect(() => {
    const getCollections = async () => {
      const collections = await Load.getAllCollections();
      useCounts.setState({ allCollections: collections });
    };
    getCollections();
  }, []);

  // Get list of sizes from database on load
  useEffect(() => {
    const getSizes = async () => {
      const sizes = await Load.getAllSizes();
      useCounts.setState({ allSizes: sizes });
    };
    getSizes();
  }, []);

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

  return (
    <Table>
      <thead>
        <tr>
          <th></th>
          <th>Total</th>
          {Object.keys(props.shelfSubtotals).map((allSizes) => (
            <th>{allSizes}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Object.entries(props.shelfSubtotals).map(([collection, sizes]) =>
          Object.entries(sizes).map(([size, count]) => (
            <tr key={`${collection}-${size}`}>
              <td>{collection}</td>
              <td>{size}</td>
              <td>{count}</td>
            </tr>
          ))
        )}
      </tbody>
    </Table>
  );
};

export default ReportCounts;
