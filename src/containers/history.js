import React, { Component } from 'react'
import ContentSearch from '../util/search'
import Load from '../util/load'
import DatePicker from 'react-datepicker';
import moment from 'moment';
import Alerts from '../components/alerts'
import { Navbar, Form, Input, Button} from 'reactstrap'
import "react-datepicker/dist/react-datepicker.css";
import ReactTable from 'react-table'
import FoldableTableHOC from "react-table/lib/hoc/foldableTable";
import 'react-table/react-table.css'

const FoldableTable = FoldableTableHOC(ReactTable);

export default class History extends Component {

    state = {
        data: [],
        pages: 1,
        total: 0,
        perPage: 20,
        loading: true,
        startDate: new Date(),
        search: []
    }

    componentDidMount = async () => {
        const search = await ContentSearch.getHistory()
        const { items, _meta } = search || []
        this.setState({
            data: items,
            pages: _meta ? _meta.pageCount : -1,
            total: _meta ? _meta.totalCount : 0,
            perPage: _meta ? _meta.perPage : 20,
            loading: false
        })
    }

    handleSearch = async (query) => {
        const search = await ContentSearch.searchHistory(query)
        const { items, _meta } = search || []
        this.setState({
            data: items,
            pages: _meta ? _meta.pageCount : -1,
            total: _meta ? _meta.totalCount : 0,
            perPage: _meta ? _meta.perPage : 20,
            loading: false
        })
    }
    
    handleChange = (date) => {
        this.setState({
            startDate: date,
            search: ''
        }, () => {
            this.handleSearch(moment(date).format('YYYY-MM-DD'))
        })
    }

    handleFormChange = e => {
        this.setState({
            [e.target.name] : e.target.value
        })
    }

    handleSubmit = (e) => {
        e.preventDefault()
        this.handleSearch(this.state.search)
    }
    
    handlePageChange = (page) => {
        this.setState({
            page: page
        }, () => {
            if(this.state.search !== ''){
                this.handleFilteredSearch(this.state.search, page)
            } else {
                this.handleSearch(`${moment(this.state.date).format('YYYY-MM-DD')}&page=${page}`) 
            }
        })
    }

    handleFilteredChange = (filtered, column) => {
        this.setState({
            search: filtered
        }, () => {
            this.handleFilteredSearch(filtered)
        })

    }

    handleFilteredSearch = async (filtered, page='') => {
        const search = await Load.getHistory(filtered, page)
        const { items, _meta } = search || []
        this.setState({
            data: items,
            pages: _meta ? _meta.pageCount : -1,
            total: _meta ? _meta.totalCount : 0,
            perPage: _meta ? _meta.perPage : 20,
            loading: false
        })
    }



    render(){
        const { data, pages, total, perPage, loading } = this.state
        return(
            <div style={{marginTop: "50px"}}>
                {/* <Navbar color="light" light style={{paddingBottom: "30px", paddingTop: "30px"}}>
                    <DatePicker
                        selected={this.state.startDate}
                        onChange={this.handleChange}
                    />
                    <SearchForm 
                        handleSubmit={this.handleSubmit}
                        handleFormChange={this.handleFormChange}
                    />
                </Navbar> */}
                <Display
                    data={data}
                    pages={pages}
                    loading={loading}
                    total={total}
                    perPage={perPage}
                    fetchData={this.fetchData}
                    handlePageChange={this.handlePageChange}
                    handleFilteredChange={this.handleFilteredChange}
                />
            </div>
        )
    }
}

const SearchForm = ({ handleSubmit, handleFormChange }) => (
    <Form inline onSubmit={(e) => handleSubmit(e)}>
        <Input type="text" name="search" onChange={(e) => handleFormChange(e)} />
        <Button color="success">Search</Button>
    </Form>
)

const Display = ({ data, pages, loading, handlePageChange, handleFilteredChange }) => (
    <FoldableTable
        data={data}
        pages={pages}
        columns={
            [{
                Header: "Item",
                id: "item",
                accessor: "item",
                foldable: true
            },{
                Header: "Update",
                id: "message",
                accessor: "message",
                foldable: true
            },{
                Header: "User",
                id: 'initials',
                accessor: "initials",
                foldable: true
            },{
                Header: "Timestamp",
                id: 'timestamp',
                accessor: 'timestamp',
                foldable: true
            }
            ]
        }
        loading={loading}
        onPageChange={(pageIndex) => handlePageChange(pageIndex + 1)}
        onFilteredChange={(filtered, column) => handleFilteredChange(filtered, column)}
        manual
        pageSize={data.length ? data.length : 20}
        filterable={true}
        className="-striped -highlight"
    />  
)

