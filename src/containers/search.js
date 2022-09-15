import React, { Component } from 'react'
import ContentSearch from '../util/search'
import Alerts from '../components/alerts'
import Load from '../util/load'
import queryString from 'query-string'
import { Table, Form, FormGroup, Label, Input, Button } from 'reactstrap'
import Skeleton from 'react-loading-skeleton'
import ReactTable from 'react-table'
import FoldableTableHOC from "react-table/lib/hoc/foldableTable";
import 'react-table/react-table.css'
import localforage from 'localforage'
import _ from 'lodash'

const FoldableTable = FoldableTableHOC(ReactTable);

export default class Search extends Component {

    state = {
        pick: [],
        searchResults: [],
        searchObject: [],
        pick: [],
        loading: false,
        searchDisplay: 'title',
        searchValue: '',
        barcodes: []
    }

    componentDidMount = async () => {
        const local = await this.handleLocalStorage('paging') || []
        const localLength = local ? Object.keys(local) : {}
        this.setState({
            pick: local
        })
    }

    handleLocalStorage = async (key) => {
        const results = await localforage.getItem(key)
        return results
    }

    handleSelection = (e, values, index) => {
        if(e.target.checked === true) {
            this.addPick(values)
        } else {
            this.removePick(values, index)
        }
    } 

    addPick = (items) => { 
        const pick = {...this.state.pick}
        pick[items.barcode] = items
        this.setState({
            pick
        }, () => {
            this.pickOrder()
            Alerts.success(`Added ${items.barcode} to paging list`)
        })
    }

    removePick = (values, index) => {
        const filtered = Object.keys(this.state.pick)
        .filter(key => key != index)
        .reduce((obj, key) => {
            obj[key] = this.state.pick[key];
            return obj;
        }, {});
        this.setState({
            pick: filtered
        }, () => {
            this.pickOrder()
            Alerts.success(`${index} removed from paging list`)
        })
    }

    pickOrder = () => {
        const list = this.state.pick
        const item = _.orderBy(list,
            ['row', 'ladder', 'shelf_number'],
            ['asc', 'asc', 'asc'])
        this.setState({ 
            pick: item
        }, () => {
            localforage.setItem('paging', this.state.pick)
        })  
    }


    handleSearch = async (e) => {
        e.preventDefault()
        const { searchValue } = this.state
        this.setState({ searchResults: [], loading: true }) 
        let search
        switch(this.state.searchDisplay){
            case 'title':
                search = await ContentSearch.ill('title', searchValue) 
                if(search && !search.length){ Alerts.info('No search results found')}
            break;
            case 'single' : 
                search = await ContentSearch.searchAleph(`barcode=${searchValue}`)
                if(search && !search.length){ Alerts.info('No search results found')}
            break    
            case 'multi':
                await this.getRecords()
            break
            case 'tray':
                search = await ContentSearch.traySearch(searchValue)
                if(search && !search.length){ Alerts.info('No search results found')}
            break   
            case 'shelf':
                search = await ContentSearch.shelfmanagement(searchValue)
            default:
            break;  
        }
        if(this.state.searchDisplay !== 'multi'){
        this.setState({
            searchResults: search ? search : [],
            loading: false
        })
    }
    }

    handleMulti = e => {
        this.setState({
            barcodes: e.target.value.split(/\r?\n/)
        }, () => console.log(this.state.barcodes))
      }

      getRecords = async () => {
          const { barcodes } = this.state
          const data = {
              barcode: this.state.barcodes.join(',')
          }
          const search = await ContentSearch.recordData(data)
          if(search && search[0] !== false){
            this.setState({
                searchResults: search ? search : [],
                loading: false
            })
          } else {
            Alerts.info('Unable to match barcode')
            this.setState({loading: false})
          }   
      }
  

      handleDisplay = display => {
          this.setState({
              searchDisplay: display.target.value
          })
      }

      addToPaging = async (e, barcode) => {
        e.preventDefault()
        const data = this.state.pick
        const search = await ContentSearch.searchAleph(barcode)
        this.setState(prevState => ({
          pick: [...prevState.pick, ...search]
        }), () => {
          Alerts.success(`${barcode} added to paging slips`)
        })
      }

      handleChange = e => {
          this.setState({
              [e.target.name] : e.target.value
          })
      }


    render(){
        const { searchResults, searchDisplay, loading } = this.state
        console.log(searchResults)
        return(
            <div>
                <SearchForm 
                    handleSearch={this.handleSearch}
                    searchDisplay={this.state.searchDisplay}
                    handleDisplay={this.handleDisplay}
                    handleChange={this.handleChange}
                    handleMulti={this.handleMulti}
                />
                 <Display
                    data={searchResults}
                    loading={loading}
                    handleSelection={this.handleSelection}
                 />
           </div>

        )
    }
}

const SearchForm = ({ handleSearch, searchDisplay, handleDisplay, handleChange, handleMulti }) => (
    <Form style={{padding: "80px"}}  onSubmit={(e) => handleSearch(e)}>
        <FormGroup>
          <Input type="select" name="searchDisplay" onChange={(e) => handleChange(e)}>
            <option value="">Search options</option>
            <option value="single">Barcode</option>
            <option value="multi">Barcode - multi</option>
            <option value="title">Title</option>
            <option value="tray">Tray</option>
          </Input>
        </FormGroup>
        {searchDisplay === 'multi' ?
        <FormGroup>
            <Input onChange={(e) => handleMulti(e)} type="textarea" name="barcodes"  placeholder="search...." />
        </FormGroup>
        :
        <FormGroup>
            <Input onChange={(e) => handleChange(e)} type="text" name="searchValue"  placeholder="search...." />
        </FormGroup>
        }
      <Button>Submit</Button>
  </Form>   
)

const Display = ({ data, loading, handleSelection }) => (
    <FoldableTable
    data={data}
    columns={
        [{
            Header: '',
            accessor: 'select',
            Cell: function(props){ 
                    return <input type="checkbox" onClick={(e) => handleSelection(e, props.original, props.index)}/>
            },
            maxWidth: 50
        },{
            Header: 'Title',
            accessor: 'title',
            foldable: true
        },{
            Header: "Status",
            accessor: "status",
            foldable: true
        },{
            Header: "Barcode",
            accessor: "barcode",
            foldable: true
        },{
            Header: "Tray Barcode",
            accessor: "tray_barcode",
            foldable: true
        },{
            Header: "Shelf Barcode",
            accessor: "shelf_barcode",
            foldable: true
        },{
            Header: "Shelf Position",
            accessor: "shelf_position",
            foldable: true
        },{
            Header: "Collection",
            accessor: "stream",
            foldable: true
        },{
            Header: "Call Number",
            accessor: "call_number",
            foldable: true
        }]
    }
    showPagination={false}
    pageSize={data.length}
    filterable={true}
    loading={loading}
/>
)

const TableHead = ({ }) => (
    <thead>
        <tr>
            <th>Title</th>
            <th>Status</th>
            <th>Barcode</th>
            <th>Tray</th>
            <th>Shelf</th>
            <th>Collection</th>
            <th>Call Number</th>
            <th>Options</th>
        </tr>  
    </thead> 
)

const TableBody = ({ list, idx, addToPaging }) => (
    <tr key={idx}>
        <td>{list.title}</td>
        <td>{list.status}</td>
        <td>{list.barcode}</td>
        <td>{list.tray_barcode}</td>
        <td>{list.shelf_barcode}</td>
        <td>{list.stream}</td>
        <td>{list.call_number}</td>
        <td onClick={(e) => addToPaging(e, list.barcode)}>[Add]</td>
    </tr>
)

const TableBodySkeleton = () => (
    [...Array(20)].map((x, i) =>
    <tr key={i}>
        <td><Skeleton /></td>
        <td><Skeleton /></td>
        <td><Skeleton /></td>
        <td><Skeleton /></td>
        <td><Skeleton /></td>
        <td><Skeleton /></td>
        <td><Skeleton /></td>
        <td><Skeleton /></td>
    </tr>
    )    
)

const SearchDisplay = ({ data, addToPaging, loading }) => (
    <Table responsive stripped>
        <TableHead />
        <tbody>
        {loading === false 
            ? 
            Object.keys(data).length 
                ? Object.keys(data).map((items,idx) => 
                    <TableBody
                        list={data[items]}
                        key={idx}
                        addToPaging={addToPaging}
                     />
                    ) 
                :   <NoResults />   
            : <TableBodySkeleton />
        }
        </tbody> 
    </Table>
)

const NoResults = () => (
    <tr>
        <td>No Results</td>
    </tr>    
)