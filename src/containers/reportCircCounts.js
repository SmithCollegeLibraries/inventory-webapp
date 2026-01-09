import { Button, Form, Input, Table } from 'reactstrap';
import Load from '../util/load';
import { success, warning } from '../components/toastAlerts';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useEffect } from 'react';

const useCircCounts = create((set, get) => {
  return {
    results: [],
  };
});

const useCircCountSettings = create(persist((set, get) => {
  return {
    circCountMin: 1,
    sortColumn: 'loans',
    sortOrder: 'desc',
  };
}, {
  name: 'report-circ-counts',
  storage: createJSONStorage(() => localStorage),
}));

const handleCsvDownload = async () => {
  const state = useCircCounts.getState();
  const { results } = state;

  if (results.length === 0) {
    warning('No data to download');
    return;
  }

  const headers = ['Collection', 'Barcode', 'Loans', 'Last circulated', 'Status', 'Shelf', 'Depth', 'Position'];
  const csvRows = [
    headers.join(','), // Header row
    ...results.map(item => [
      item.collection ?? '',
      item.barcode ?? '',
      item.loans ?? '',
      item.last_circulation_date ?? '',
      item.status ?? '',
      item.shelf ?? '',
      item.depth ?? '',
      item.position ?? '',
    ].map(value => `"${value}"`).join(','))
  ];

  const csvContent = csvRows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const dateStr = new Date().toISOString().slice(0,10); // YYYY-MM-DD
  link.setAttribute('download', `circ-counts-${dateStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const ReportCircCounts = (props) => {

  const resultState = useCircCounts();
  const settingState = useCircCountSettings();

  const handleQueryChange = (e) => {
    e.preventDefault();
    let circCountMin = e.target.value;
    useCircCountSettings.setState({ circCountMin });
  };

  const handleSearch = async () => {
    const results = await Load.itemCircCounts(settingState.circCountMin);
    if (results) {
      useCircCounts.setState({ results });
      success(`${results.length} results`);
    }
    else {
      useCircCounts.setState({ results: [] });
      warning('No results');
    }
  };

  const handleSearchButton = (e) => {
    e.preventDefault();
    handleSearch();
  };

  const handleSort = (column) => {
    const { sortColumn, sortOrder } = settingState;
    const results = resultState.results || [];
    const newSortOrder = sortColumn === column && sortOrder === 'asc' ? 'desc' : 'asc';

    const sortedResults = [...results].sort((a, b) => {
      const va = a[column] ?? '';
      const vb = b[column] ?? '';
      if (va < vb) return newSortOrder === 'asc' ? -1 : 1;
      if (va > vb) return newSortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    useCircCounts.setState({ results: sortedResults });
    useCircCountSettings.setState({ sortColumn: column, sortOrder: newSortOrder });
  };

  return (
    <div>
      <div style={{ marginTop: 0 }}>
        <SearchForm
          circCountMin={settingState.circCountMin}
          resultsCount={resultState.results.length}
          handleSearchButton={handleSearchButton}
          handleQueryChange={handleQueryChange}
        />
        <ResultDisplay
          data={resultState.results}
          sortColumn={settingState.sortColumn}
          sortOrder={settingState.sortOrder}
          handleSort={handleSort}
        />
      </div>
    </div>
  );
};

const SearchForm = (props) => {
  useEffect(() => {
    let cancelled = false;
    const fetchResults = async () => {
      const results = await Load.itemCircCounts(props.circCountMin);
      if (cancelled) return;
      if (results) {
        useCircCounts.setState({ results });
        // success(`${results.length} results`);
      } else {
        useCircCounts.setState({ results: [] });
        warning('No results');
      }
    };
    fetchResults();
    return () => { cancelled = true; };
  }, [props.circCountMin]);

  return (
    <div style={{ float: "left", width: "100%", position: "relative", whiteSpace: "normal", overflowWrap: "break-word" }} autoComplete="off">
      <div style={{
        position: "absolute",
        top: "20px",
        right: 0,
        zIndex: 2
      }}>
        <Button
          color={"success"}
          style={{
            margin: "0",
          }}
          onClick={handleCsvDownload}
        >
          Download CSV
        </Button>
      </div>

      <h1 style={{
        position: "absolute",
        left: "50%",
        transform: "translateX(-50%)",
        top: 0,
        margin: 0,
        padding: 0,
        fontSize: "1.75rem",
        lineHeight: "4.75rem",
        zIndex: 1,
        pointerEvents: "none"
      }}>
        Circ counts
      </h1>

      <div style={{ display: 'block', marginTop: "20px", paddingTop: 0, marginBottom: '10px', width: '40vw', minWidth: '200px' }}>
        At least
        <Input
          type="number"
          name="query"
          placeholder="1"
          min="1"
          value={props.circCountMin}
          style={{ display: 'inline', width: '4em', marginLeft: '10px', marginRight: '10px' }}
          onChange={(e) => props.handleQueryChange(e)}
        />
        {props.circCountMin == 1 ? 'loan ' : 'loans '}
        since being added to SIS: <strong>{ props.resultsCount }&nbsp;items</strong>
      </div>
    </div>
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
      <th onClick={() => handleSort('shelf')}>Shelf {sortColumn === 'shelf' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
      <th onClick={() => handleSort('depth')}>Depth {sortColumn === 'depth' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
      <th onClick={() => handleSort('position')}>Position {sortColumn === 'position' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
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
    <td>{item.shelf ?? '-'}</td>
    <td>{item.depth ?? '-'}</td>
    <td>{item.position ?? '-'}</td>
  </tr>
);

export default ReportCircCounts;
