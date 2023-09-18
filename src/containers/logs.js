import React, { useReducer, useEffect } from 'react';
import ContentSearch from '../util/search';
// import { Row, Table, Button } from 'reactstrap';

const itemReducer = (state, action) => {
  switch (action.type) {
    case 'CHANGE_VIEW':
      return {
        ...state,
        currentView: action.view,
      };
    case 'QUERY_CHANGE':
      return {
        ...state,
        queryBarcode: action.barcode,
        queryAction: action.action,
        queryDetails: action.details,
      };
    case 'UPDATE_TRAY_LOG_RESULTS':
      return {
        ...state,
        trayLogResults: action.payload,
      };
    case 'UPDATE_ITEM_LOG_RESULTS':
      return {
        ...state,
        itemLogResults: action.payload,
      };
    case 'RESET_TRAY_LOG_RESULTS':
      return {
        ...state,
        trayLogResults: [],
      };
    case 'RESET_ITEM_LOG_RESULTS':
      return {
        ...state,
        itemLogResults: [],
      };
    default:
      return state;
  }
};

const Logs = () => {
  const TRAY_LOGS = "Tray Logs";
  const ITEM_LOGS = "Item Logs";

  const initialState = {
    view: "",
    itemLogResults: [],
    trayLogResults: [],
    queryBarcode: "",
    queryAction: "",
    queryDetails: "",
  };

  const [data, dispatch] = useReducer(itemReducer, initialState);

  const getData = async () => {
    const itemLogsRaw = await ContentSearch.itemLogs();
    const trayLogsRaw = await ContentSearch.trayLogs();

    // For now, we'll work under the assumption that we get the data
    // in the form that we want. This function can be adjusted if that
    // turns out not to be the case.
    const processData = (rawData) => {
      return rawData;
    }

    dispatch({
      type: "GET_DATA",
      itemLogResults: processData(itemLogsRaw),
      trayLogResults: processData(trayLogsRaw),
    });
  };

  // When a view's button is clicked, change the view
  const changeView = (v) => {
    dispatch({ type: "CHANGE_VIEW", view: v });
  };

  // Get most logs via the API on load
  useEffect(() => {
    getData();
  }, []);

  return (
    <div>
    </div>
  );
};

export default Logs;
