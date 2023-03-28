import React, { useReducer, useEffect, Fragment } from 'react';
import Load from '../util/load';
import { Table, Button } from 'reactstrap';

const COUNT_THRESHOLD = 10;

const itemReducer = (state, action) => {
  switch (action.type) {
    case 'GET_DATA':
      return {
        ...state,
        newItems: action.newItems,
        newTrays: action.newTrays,
        traysShelved: action.traysShelved,
      };
    case 'CHANGE_VIEW':
      return {
        ...state,
        currentView: action.view,
      };
    default:
      return state;
  }
};

const Statistics = () => {
  const NEW_ITEMS = "New items";
  const NEW_TRAYS = "New trays";
  const TRAYS_SHELVED = "Trays shelved";

  const initialState = {
    view: NEW_ITEMS,
    newItems: {},
    newTrays: {},
    traysShelved: {},
  };

  const [data, dispatch] = useReducer(itemReducer, initialState);

  const getData = async () => {
    const processData = (rawData, countThreshold=COUNT_THRESHOLD) => {
      const dayToNames = day => day['counts'].map((d) => d['name']);
      const dayToTotalCount = day => day['counts'].map((d) => parseInt(d['count'])).reduce((a, b) => a + b, 0);
      const allNames = new Set(rawData.reduce((a, b) => a.concat(dayToNames(b)), []));
      const namesWithTotalCounts = Array.from(allNames).map((name) => {
        return {
          name: name,
          count: rawData.reduce(
            (a, b) => a + b['counts'].filter((p) => p['name'] === name)
              .reduce((a, b) => a + parseInt(b['count']), 0),
            0),
        };
      });
      const namesToDisplay = namesWithTotalCounts
        .filter((d) => d['count'] > countThreshold)
        .map(p => p['name']);
      const organizedData = rawData.map((day) => {
        const perUserCounts = namesToDisplay.map(
          name => day['counts'].filter(p => p['name'] === name)
            .reduce((a, b) => a + parseInt(b['count']), 0));
        return {
          date: day['date'],
          total: dayToTotalCount(day),
          other: dayToTotalCount(day) - perUserCounts.reduce((a, b) => a + b, 0),
          countsByPerson: perUserCounts,
        };
      });
      // Don't show rows with 0 in each person in counts
      return {
        names: namesToDisplay,
        data: organizedData.filter((d) => d['countsByPerson'])
      };
    };

    const newItemsRaw = await Load.newItemsLog();
    const newTraysRaw = await Load.newTraysLog();
    const traysShelvedRaw = await Load.traysShelvedLog();

    dispatch({
      type: "GET_DATA",
      newItems: processData(newItemsRaw),
      newTrays: processData(newTraysRaw),
      traysShelved: processData(traysShelvedRaw),
    });
  };

  // When a view's button is clicked, change the view
  const changeView = (e) => {
    dispatch({ type: "CHANGE_VIEW", view: e.target.innerText });
  };

  useEffect(() => {
    dispatch({ type: "CHANGE_VIEW", view: NEW_ITEMS });
    getData();
  }, []);

  return (
    <Fragment>
      <div style={{paddingTop: "20px", paddingBottom: "20px"}}>
        <Button color={data.currentView === NEW_ITEMS ? "success" : "primary"} onClick={(e) => changeView(e)}>
          {NEW_ITEMS}
        </Button>{' '}
        <Button color={data.currentView === NEW_TRAYS ? "success" : "primary"} onClick={(e) => changeView(e)}>
          {NEW_TRAYS}
        </Button>{' '}
        <Button color={data.currentView === TRAYS_SHELVED ? "success" : "primary"} onClick={(e) => changeView(e)}>
          {TRAYS_SHELVED}
        </Button>
      </div>
      <h1>{data.view}</h1>
      <Table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Total</th>
            {(data.currentView === NEW_ITEMS && data.newItems.names) ? data.newItems.names.map((name, index) => <th key={index}>{name.split(" ")[0]}</th>) : null}
            {data.currentView === NEW_TRAYS && data.newTrays.names ? data.newTrays.names.map((name, index) => <th key={index}>{name.split(" ")[0]}</th>) : null}
            {data.currentView === TRAYS_SHELVED && data.traysShelved.names ? data.traysShelved.names.map((name, index) => <th key={index}>{name.split(" ")[0]}</th>) : null}
            <th>Other</th>
          </tr>
        </thead>
        <tbody>
          {data.currentView === NEW_ITEMS && data.newItems.data ?
            data.newItems.data.map((day, index) => (
              <tr key={index}>
                <td>{day.date}</td>
                <td>{day.total}</td>
                {day.countsByPerson.map((count, index) => <td key={index}>{count}</td>)}
                <td>{day.other}</td>
              </tr>
            )) : null}
            {data.currentView === NEW_TRAYS && data.newItems.data ?
              data.newTrays.data.map((day, index) => (
                <tr key={index}>
                  <td>{day.date}</td>
                  <td>{day.total}</td>
                  {day.countsByPerson.map((count, index) => <td key={index}>{count}</td>)}
                  <td>{day.other}</td>
                </tr>
              )) : null}
              {data.currentView === TRAYS_SHELVED && data.newItems.data ?
                data.traysShelved.data.map((day, index) => (
                  <tr key={index}>
                    <td>{day.date}</td>
                    <td>{day.total}</td>
                    {day.countsByPerson.map((count, index) => <td key={index}>{count}</td>)}
                    <td>{day.other}</td>
                  </tr>
                )) : null}
        </tbody>
      </Table>
    </Fragment>
  );
};

export default Statistics;
