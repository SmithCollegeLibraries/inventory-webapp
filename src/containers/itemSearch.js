import React, { useReducer } from 'react';
import { Button, Form, Input, Row, Col, Table } from 'reactstrap';
import Load from '../util/load';
import { warning } from '../components/toastAlerts';

const reducer = (state, action) => {
  switch (action.type) {
    case 'QUERY_CHANGE':
      return {
        ...state,
        item_list_as_string: action.payload
      };
    case 'UPDATE_RESULTS':
      return {
        ...state,
        // fields: action.payload.data,
        search_results: action.payload.search_results,
      };
    case 'RESET_RESULTS':
      return {
        ...state,
        search_results: [],
      };
    default:
      throw new Error();
  }
};

const ItemSearch = (props) => {
  const initialState = {
    collections: [],
    item_list_as_string: '',
    search_results: [],
  };

  const [ state, dispatch ] = useReducer(reducer, initialState);

  const handleQueryChange = (e) => {
    e.preventDefault();
    let value = e.target.value;
    dispatch({
      type: "QUERY_CHANGE",
      payload: value,
    });
  };

  const handleSearch = async () => {
    const payload = {
      barcodes: state.item_list_as_string.split('\n').filter(Boolean),
    };
    const results = (state.item_list_as_string) ? await Load.itemSearchLocations(payload) : [];
    if (results) {
      dispatch({
        type: 'UPDATE_RESULTS',
        payload: {
          search_results: results,
        }
      });
    }
    else {
      dispatch({
        type: 'UPDATE_RESULTS',
        payload: {
          search_results: [],
          fields: {
            new_item: false,
            item_barcode: '',
            new_item_barcode: '',
            title: '',
            call_number: '',
            collection: '',
            status: '',
            tray: '',
            shelf: '',
            depth: '',
            position: 0,
          },
        }
      });
      warning('No results found');
    }
  };

  const handleSearchButton = (e) => {
    e.preventDefault();
    handleSearch();
  };

  return (
    <div>
      <div style={{marginTop: "20px"}}>
        <Row>
          <Col md="4">
            <SearchForm
              query={state.item_list_as_string}
              handleSearchButton={handleSearchButton}
              handleQueryChange={handleQueryChange}
            />
          </Col>
          <Col md="8">
            { <ResultDisplay data={state.search_results} /> }
            {/* { state.search_results.length
              ? <ResultDisplay data={state.search_results} />
              : null
            } */}
          </Col>
        </Row>
      </div>
    </div>
  );
};

const SearchForm = props => {
  return (
    <Form autoComplete="off" onSubmit={e => {e.preventDefault(); props.handleSearchButton(e)}}>
      <Input
        type="textarea"
        name="query"
        rows="20"
        placeholder="List of item barcodes"
        value={props.item_list_as_string}
        onChange={(e) => props.handleQueryChange(e)}
      />
      <Button color="primary" style={{"marginTop": "10px"}}>Search</Button>
    </Form>
  );
};

const ResultDisplay = ({ data }) => (
  <Table responsive striped>
    <TableHead />
    <tbody>
      { Object.keys(data).map((barcode, idx) =>
          <TableRow
            item={data[barcode]}
            key={idx}
          />
        )
      }
    </tbody>
  </Table>
)

const TableHead = () => (
  <thead>
    <tr>
      <th>Barcode</th>
      {/* <th>Title</th>
      <th>Call number</th> */}
      <th>System</th>
      <th>Status</th>
      <th>Tray</th>
      <th>Shelf</th>
      <th>Depth</th>
      <th>Position</th>
    </tr>
  </thead>
)

const TableRow = ({ item, idx }) => (
  <tr key={idx}>
    <td>{item.barcode}</td>
    {/* <td></td>
    <td></td> */}
    <td>{item.system ? item.system : 'Not in SIS'}</td>
    <td>{item.status ? item.status : '-'}</td>
    <td>{item.tray ? item.tray : '-'}</td>
    <td>{item.shelf ? item.shelf : '-'}</td>
    <td>{item.depth ? item.depth : '-'}</td>
    <td>{item.position ? item.position : '-'}</td>
  </tr>
)

export default ItemSearch;
