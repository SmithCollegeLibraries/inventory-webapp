import { Button, Form, Input, Table } from 'reactstrap';
import Load from '../util/load';
import { success, warning } from '../components/toastAlerts';
import { create } from 'zustand';

const useCircCounts = create((set, get) => {
  return {
    min: 1,
    results: [],
    sortColumn: null,
    sortOrder: 'asc', // 'asc' or 'desc'
  };
});

const ReportCircCounts = (props) => {
  const state = useCircCounts();

  const handleQueryChange = (e) => {
    e.preventDefault();
    let min = e.target.value;
    useCircCounts.setState({ min });
  };

  const handleSearch = async () => {
    const results = await Load.itemCircCounts(state.min);
    if (results) {
      useCircCounts.setState({ results });
      success(`${results.length} results found`);
    }
    else {
      useCircCounts.setState({ results: [] });
      warning('No results found');
    }
  };

  const handleSearchButton = (e) => {
    e.preventDefault();
    handleSearch();
  };

  const handleSort = (column) => {
    const { sortColumn, sortOrder, results } = state;
    const newSortOrder = sortColumn === column && sortOrder === 'asc' ? 'desc' : 'asc';

    const sortedResults = [...results].sort((a, b) => {
      if (a[column] < b[column]) return newSortOrder === 'asc' ? -1 : 1;
      if (a[column] > b[column]) return newSortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    useCircCounts.setState({
      results: sortedResults,
      sortColumn: column,
      sortOrder: newSortOrder,
    });
  };

  return (
    <div>
      <div style={{ marginTop: '20px' }}>
        <SearchForm
          min={state.min}
          handleSearchButton={handleSearchButton}
          handleQueryChange={handleQueryChange}
        />
        <ResultDisplay
          data={state.results}
          sortColumn={state.sortColumn}
          sortOrder={state.sortOrder}
          handleSort={handleSort}
        />
      </div>
    </div>
  );
};

const SearchForm = (props) => {
  return (
    <Form autoComplete="off" onSubmit={(e) => { e.preventDefault(); props.handleSearchButton(e); }}>
      Look for items with at least
      <Input
        type="number"
        name="query"
        placeholder="1"
        min="1"
        value={props.min}
        style={{ display: 'inline', width: '4em', marginLeft: '10px', marginRight: '10px' }}
        onChange={(e) => props.handleQueryChange(e)}
      />
      {props.min > 1 ? 'loans ' : 'loan '}
      since being added or retrayed in the Annex
      <br />
      <Button color="primary" style={{ marginTop: '10px', marginBottom: '20px' }}>Search</Button>
    </Form>
  );
};

const ResultDisplay = ({ data, sortColumn, sortOrder, handleSort }) => (
  <Table responsive striped>
    <TableHead sortColumn={sortColumn} sortOrder={sortOrder} handleSort={handleSort} />
    <tbody>
      {Object.keys(data).map((barcode, idx) => (
        <TableRow
          item={data[barcode]}
          key={idx}
        />
      ))}
    </tbody>
  </Table>
);

const TableHead = ({ sortColumn, sortOrder, handleSort }) => (
  <thead style={{cursor: 'pointer'}}>
    <tr>
      <th onClick={() => handleSort('collection')}>Collection {sortColumn === 'collection' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
      <th onClick={() => handleSort('barcode')}>Barcode {sortColumn === 'barcode' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
      <th onClick={() => handleSort('loans')}>Loans {sortColumn === 'loans' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
      <th onClick={() => handleSort('last_circulation_date')}>Last circulated {sortColumn === 'last_circulation_date' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
      <th onClick={() => handleSort('status')}>Status {sortColumn === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
      <th onClick={() => handleSort('shelf')}>Location {sortColumn === 'shelf' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
    </tr>
  </thead>
);

const TableRow = ({ item, idx }) => (
  <tr key={idx}>
    <td>{item.collection ? item.collection : '-'}</td>
    <td><a href={`https://fivecolleges.folio.ebsco.com/inventory?filters=staffSuppress.false&qindex=items.barcode&query=${item.barcode}&segment=items&sort=title`} rel="noreferrer" target="_blank">{item.barcode}</a></td>
    <td>{item.loans ?? '-'}</td>
    <td>{item.last_circulation_date ?? '-'}</td>
    <td>{item.status ?? '-'}</td>
    <td>{item.shelf ?? '-'} {item.depth ? "• " + item.depth : ""} {item.position ? "• " + item.position : ""}</td>
  </tr>
);

export default ReportCircCounts;
