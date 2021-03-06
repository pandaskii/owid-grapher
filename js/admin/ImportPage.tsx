// WIP

import * as React from 'react'
import * as ReactDOM from 'react-dom'
import { map, uniqBy, filter, keys, groupBy, isEmpty, difference, find, clone } from '../charts/Util'
import { observable, computed, action, autorun, reaction, runInAction, IReactionDisposer } from 'mobx'
import { observer } from 'mobx-react'

import * as parse from 'csv-parse'
import { Modal, BindString, NumericSelectField } from './Forms'
import Admin from './Admin'
import AdminLayout from './AdminLayout'
import { update } from '../../node_modules/@types/lodash-es';

const styles = require('./Importer.css')

declare const App: any
declare const window: any

class EditableVariable {
    @observable overwriteId?: number
    @observable name: string
    @observable unit: string
    @observable description: string
    @observable coverage: string
    @observable timespan: string
    @observable source?: any
    @observable values: string[]

    constructor({ overwriteId = undefined, name = "", description = "", coverage = "", timespan = "", unit = "", source = undefined } = {}) {
        this.overwriteId = overwriteId
        this.name = name
        this.unit = unit
        this.coverage = coverage
        this.timespan = timespan
        this.description = description
        this.source = source
        this.values = []
    }
}

interface ExistingVariable {
    id: number
    name: string
    source: {
        id: number
        name: string
        description: string
    }
}

class EditableDataset {
    @observable id?: number
    @observable name: string = ""
    @observable description: string = ""
    @observable subcategoryId?: number
    @observable existingVariables: ExistingVariable[] = []
    @observable newVariables: EditableVariable[] = []
    @observable years: number[] = []
    @observable entities: number[] = []
    @observable entityNames: string[] = []

    @observable source: {
        name: string
        dataPublishedBy: string
        dataPublisherSource: string
        link: string
        retrievedDate: string
        additionalInfo: string
    } = {
        name: "",
        dataPublishedBy: "",
        dataPublisherSource: "",
        link: "",
        retrievedDate: "",
        additionalInfo: ""
    }

    update(json: any) {
        for (const key in this) {
            if (key in json)
                this[key] = json[key]
        }
    }

    constructor() {
        // Match existing to new variables
        reaction(
            () => this.newVariables && this.existingVariables,
            () => {
                if (!this.newVariables || !this.existingVariables)
                    return

                this.newVariables.forEach(variable => {
                    const match = this.existingVariables.filter(v => v.name === variable.name)[0]
                    if (match) {
                        keys(match).forEach(key => {
                            if (key === 'id')
                                variable.overwriteId = (match as any)[key]
                            else
                                (variable as any)[key] = (match as any)[key]
                        })
                    }
                })
            }
        )
    }

    @computed get isLoading() {
        return this.id && !this.existingVariables.length
    }
}

@observer
class DataPreview extends React.Component<{ csv: CSV }> {
    @observable rowOffset: number = 0
    @observable visibleRows: number = 10
    @computed get numRows(): number {
        return this.props.csv.rows.length
    }

    @action.bound onScroll({ target }: { target: HTMLElement }) {
        const { scrollTop, scrollHeight } = target
        const { numRows } = this

        const rowOffset = Math.round(scrollTop / scrollHeight * numRows)
        target.scrollTop = Math.round(rowOffset / numRows * scrollHeight)

        this.rowOffset = rowOffset
    }

    render() {
        const { rows } = this.props.csv
        const { rowOffset, visibleRows, numRows } = this
        const height = 50

        return <div style={{ height: height * visibleRows, overflowY: 'scroll' }} onScroll={this.onScroll as any}>
            <div style={{ height: height * numRows, paddingTop: height * rowOffset }}>
                <table className="table" style={{ background: 'white' }}>
                    {rows.slice(rowOffset, rowOffset + visibleRows).map((row, i) =>
                        <tr>
                            <td>{rowOffset + i + 1}</td>
                            {row.map(cell => <td style={{ height: height }}>{cell}</td>)}
                        </tr>
                    )}
                </table>
            </div>
        </div>
    }
}

const EditCategory = (props: { dataset: EditableDataset, categories: { id: number, name: string, parent: string }[] }) => {
    const { dataset, categories } = props
    const categoriesByParent = groupBy(categories, (c: any) => c.parent)

    return <label>
        Category <span className="form-section-desc">(Currently used only for internal organization)</span>
        <select onChange={e => dataset.subcategoryId = parseInt(e.target.value)} value={dataset.subcategoryId}>
            {map(categoriesByParent, (subcats, parent) =>
                <optgroup label={parent}>
                    {subcats.map((category: any) =>
                        <option value={category.id}>{category.name}</option>
                    )}
                </optgroup>
            )}
        </select>
    </label>
}

@observer
class EditVariable extends React.Component<{ variable: EditableVariable, dataset: EditableDataset }> {
    @observable isEditingSource: boolean = false

    @action.bound onEditSource(e: React.MouseEvent<HTMLButtonElement>) {
        e.preventDefault()
        this.isEditingSource = !this.isEditingSource
    }

    render() {
        const { variable, dataset } = this.props
        const { isEditingSource } = this

        const sourceName = variable.source && (variable.source.id ? variable.source.name : `New: ${variable.source.name}`)

        return <li className={styles.editVariable}>
            <div className="variableProps">
                <label className="name">
                    Name <br />
                    <span className="form-section-desc explanatory-notes">The variable name will be displayed in charts ('Sources' tab). For charts with many variables, the name will be crucial for readers to understand which sources correspond to which variables. <br /> Variable name should be of the format "Minimal variable description (Source)". For example: "Top marginal income tax rate (Piketty 2014)". Or "Tax revenue as share of GDP (ICTD 2016)"</span>
                    <input value={variable.name} onInput={e => variable.name = e.currentTarget.value} placeholder="Enter variable name" />
                </label>
                <label className="description">
                    Description <br />
                    <span className="form-section-desc explanatory-notes">
                        The variable  description will be displayed in charts (‘Sources’ tab). It will be the first row in the table explaining the variable sources.<br />
                        Variable descriptions should be concise but clear and self-contained. They will correspond, roughly, to the information that will go in the subtitle of charts. <br />
                        For example: “Percentage of the population covered by health insurance (includes affiliated members of health insurance or estimation of the population having free access to health care services provided by the State)”</span>
                    <textarea rows={4} placeholder="Short description of variable" value={variable.description} onInput={e => variable.description = e.currentTarget.value} />
                </label>
                <label>Unit <span className="form-section-desc explanatory-notes">(is displayed in axis-labels as suffix and in the legend of the map)</span>
                    <input value={variable.unit} onInput={e => variable.unit = e.currentTarget.value} placeholder="e.g. % or $" /></label>
                <label>Geographic Coverage<input value={variable.coverage} onInput={e => variable.coverage = e.currentTarget.value} placeholder="e.g. Global by country" /></label>
                <label>Time Span<input value={variable.timespan} onInput={e => variable.timespan = e.currentTarget.value} placeholder="e.g. 1920-1990" /></label>
                <label>Action
                    <select onChange={e => { variable.overwriteId = e.target.value ? parseInt(e.target.value) : undefined }}>
                        <option value="" selected={variable.overwriteId === undefined}>Create new variable</option>
                        {dataset.existingVariables.map(v =>
                            <option value={v.id} selected={variable.overwriteId === v.id}>Overwrite {v.name}</option>
                        )}
                    </select>
                </label>
            </div>
        </li>
    }
}

@observer
class EditVariables extends React.Component<{ dataset: EditableDataset }> {
    render() {
        const { dataset } = this.props

        return <section className="form-section variables-section">
            <h3>Variable names and descriptions</h3>
            <p className="form-section-desc">Here you can configure the variables that will be stored for your dataset.</p>
            <ol>
                {dataset.newVariables.map(variable =>
                    <EditVariable variable={variable} dataset={dataset} />
                )}
            </ol>
        </section>
    }
}

@observer
class EditSource extends React.Component<{ dataset: EditableDataset }> {
    render() {
        const { dataset } = this.props
        const { source } = dataset

        return <section>
            <hr />
            <h4>Dataset source information</h4>
            <label>
                <span>Source Name:</span>
                <input type="text" required value={source.name} onInput={e => source.name = e.currentTarget.value} />
            </label>
            <p className="form-section-desc">
                The source name will be displayed in charts (at the bottom of the ‘Chart’ and ‘Map’ tabs). For academic papers, the name of the source should be “Authors (year)”. For example Arroyo-Abad and Lindert (2016). <br />
                For institutional projects or reports, the name should be “Institution, Project (year or vintage)”. For example: U.S. Bureau of Labor Statistics, Consumer Expenditure Survey (2015 release). <br />
                For data that we have modified extensively, the name should be "Our World In Data based on Author (year)”. For example: Our World In Data based on Atkinson (2002) and Sen (2000).
            </p>
            <label>
                <span>Data published by:</span>
                <input type="text" value={source.dataPublishedBy} onInput={e => source.dataPublishedBy = e.currentTarget.value} />
            </label>
            <label>
                <span>Data publisher's source:</span>
                <input type="text" value={source.dataPublisherSource} onInput={e => source.dataPublisherSource = e.currentTarget.value} />
            </label>
            <label>
                <span>Link:</span>
                <input type="text" value={source.link} onInput={e => source.link = e.currentTarget.value} />
            </label>
            <label>
                <span>Retrieved:</span>
                <input type="text" value={source.retrievedDate} onInput={e => source.retrievedDate = e.currentTarget.value} />
            </label>
            <label>
                <span>Additional Information:</span>
                <textarea rows={5} value={source.additionalInfo} onInput={e => source.additionalInfo = e.currentTarget.value}></textarea>
            </label>
            <p className="form-section-desc">
                For academic papers, the first item in the description should be “Data published by: complete reference”.  This should be followed by the authors underlying sources, a link to the paper, and the date on which the paper was accessed. <br />
                For institutional projects, the format should be similar, but detailing the corresponding project or report. <br />
                For data that we have modified extensively in order to change the meaning of the data, we should list OWID as publisher, and provide the name of the person in charge of the calculation.<br />
                The field “Data publisher’s source” should give basic pointers (e.g. surveys data). Anything longer than a line should be relegated to the field “Additional information”. <br />
            </p>
        </section>
    }
}

@observer
class ImportProgressModal extends React.Component<{ dataset: EditableDataset, onDismiss: () => void, importError?: string, importSuccess: boolean }> {
    render() {
        const { dataset, onDismiss, importError, importSuccess } = this.props
        return <Modal onClose={onDismiss}>
            <div className="modal-header">
                <h4 className="modal-title">Import progress</h4>
            </div>
            <div className={styles.importProgress + " modal-body"}>
                <div className="progressInner">
                    <p className="success"><i className="fa fa-check" /> Preparing import for {dataset.years.length} values...</p>
                    {importError && <p className="error"><i className="fa fa-times" /> Error: {importError}</p>}
                    {importSuccess && <p className="success"><i className="fa fa-check" /> Import successful!</p>}
                    {!importSuccess && !importError && <div style={{ textAlign: 'center' }}><i className="fa fa-spin fa-spinner" /></div>}
                </div>
                {importSuccess && <a className="btn btn-success" href={App.url(`/admin/datasets/${dataset.id}`)}>Done</a>}
                {importError && <a className="btn btn-warning" onClick={onDismiss}>Dismiss</a>}
            </div>
        </Modal>
    }
}

interface ValidationResults {
    results: { class: string, message: string }[]
    passed: boolean
}

class CSV {
    static transformSingleLayout(rows: string[][]) {
        const newRows = [['Entity', 'Year', (this as any).basename]]

        for (let i = 1; i < rows.length; i++) {
            const entity = rows[i][0]
            for (let j = 1; j < rows[0].length; j++) {
                const year = rows[0][j]
                const value = rows[i][j]

                newRows.push([entity, year, value])
            }
        }

        return newRows
    }

    filename: string
    rows: string[][]
    existingEntities: string[]

    @computed get basename() {
        return (this.filename.match(/(.*?)(.csv)?$/) || [])[1]
    }

    @computed get data() {
        const { rows } = this

        const variables: any[] = []
        const entityNameCheck: any = {}
        const entityNames = []
        const entities = []
        const years = []

        const headingRow = rows[0]
        for (const name of headingRow.slice(2))
            variables.push(new EditableVariable({ name }))

        for (let i = 1; i < rows.length; i++) {
            const row = rows[i]
            const entityName = row[0], year = row[1]

            let entity = entityNameCheck[entityName]
            if (entity === undefined) {
                entity = entityNames.length
                entityNames.push(entityName)
                entityNameCheck[entityName] = entity
            }
            entities.push(entity)
            years.push(+year)
            row.slice(2).forEach((value, j) => {
                variables[j].values.push(value)
            })
        }

        return {
            variables: variables,
            entityNames: entityNames,
            entities: entities,
            years: years
        }
    }


    @computed get validation(): ValidationResults {
        const validation: ValidationResults = { results: [], passed: false }
        const { rows } = this

        // Check we actually have enough data
        if (rows[0].length < 3) {
            validation.results.push({
                class: 'danger',
                message: `No variables detected. CSV should have at least 3 columns.`
            })
        }

        // Make sure entities and years are valid
        const invalidLines = []
        for (let i = 1; i < rows.length; i++) {
            const year = rows[i][1]
            if ((+year).toString() !== year || isEmpty(rows[i][0])) {
                invalidLines.push(i + 1)
            }
        }

        if (invalidLines.length) {
            validation.results.push({
                class: 'danger',
                message: `Invalid or missing entity/year on lines: ${invalidLines.join(', ')}`
            })
        }

        // Check for duplicates
        const uniqCheck: any = {}
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i]
            const entityName = row[0], year = row[1]
            const key = entityName + '-' + year
            uniqCheck[key] = uniqCheck[key] || 0
            uniqCheck[key] += 1
        }

        keys(uniqCheck).forEach(key => {
            const count = uniqCheck[key]
            if (count > 1) {
                validation.results.push({
                    class: 'danger',
                    message: `Duplicates detected: ${count} instances of ${key}.`
                })
            }
        })

        // Warn about non-numeric data
        const nonNumeric = []
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i]
            for (let j = 2; j < row.length; j++) {
                if (row[j] !== '' && (isNaN(parseFloat(row[j])) || !row[j].match(/^[0-9.-]+$/)))
                    nonNumeric.push(i + 1 + " `" + row[j] + "`")
            }
        }

        if (nonNumeric.length)
            validation.results.push({
                class: 'warning',
                message: "Non-numeric data detected on line " + nonNumeric.join(", ")
            })

        // Warn if we're creating novel entities
        const newEntities = difference(this.data.entityNames, this.existingEntities)
        if (newEntities.length >= 1) {
            validation.results.push({
                class: 'warning',
                message: `These entities were not found in the database and will be created: ${newEntities.join(', ')}`
            })
        }

        validation.passed = !find(validation.results, result => result.class === "error")

        return validation
    }

    @computed get isValid() {
        return this.validation.passed
    }

    constructor({ filename = "", rows = [], existingEntities = [] }) {
        this.filename = filename
        this.rows = rows
        this.existingEntities = existingEntities
    }
}

@observer
class ValidationView extends React.Component<{ validation: ValidationResults }> {
    render() {
        const { validation } = this.props

        return <section className={styles.validation}>
            {validation.results.map((v: any) =>
                <div className={`alert alert-${v.class}`}>{v.message}</div>
            )}
        </section>
    }
}

@observer
class CSVSelector extends React.Component<{ existingEntities: string[], onCSV: (csv: CSV) => void }> {
    @observable csv?: CSV

    @action.bound onChooseCSV({ target }: { target: HTMLInputElement }) {
        const { existingEntities } = this.props
        const file = target.files && target.files[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = (e) => {
            const csv = (e as any).target.result
            parse(csv, { relax_column_count: true, skip_empty_lines: true, rtrim: true },
                (_, rows) => {
                    // TODO error handling
                    //console.log("Error?", err)
                    if (rows[0][0].toLowerCase() === 'year')
                        rows = CSV.transformSingleLayout(rows)
                    this.csv = new CSV({ filename: file.name, rows, existingEntities } as any)
                    this.props.onCSV(this.csv as any)
                }
            )
        }
        reader.readAsText(file)
    }

    render() {
        const { csv } = this

        return <section>
            <input type="file" onChange={this.onChooseCSV} />
            {csv && <DataPreview csv={csv} />}
            {csv && <ValidationView validation={csv.validation} />}
        </section>
    }
}

@observer
class Importer extends React.Component<ImportPageData> {
    context!: { admin: Admin }

    @observable csv?: CSV
    @observable.ref dataset = new EditableDataset()
    @observable existingDatasetId?: number

    @observable importError?: string
    @observable importRequest?: any
    @observable importSuccess: boolean = false

    @action.bound onChooseDataset(datasetId: number) {
        this.existingDatasetId = datasetId === -1 ? undefined : datasetId
        /*const d = this.props.datasets[datasetId - 1]
        this.dataset = d ? EditableDataset.fromServer(d) : new EditableDataset()
        this.fillDataset(this.dataset)*/
    }

    @action.bound onCSV(csv: CSV) {
        this.csv = csv

        // Look for an existing dataset that matches this csv filename
        const existingDataset = this.props.datasets.find(d => d.name === csv.basename)

        if (existingDataset) {
            this.existingDatasetId = existingDataset.id
        } else {
            this.dataset = new EditableDataset()
            this.fillDataset(this.dataset)
        }
    }

    fillDataset(dataset: EditableDataset) {
        const { csv } = this
        if (!csv) return

        if (!dataset.name)
            dataset.name = csv.basename

        dataset.newVariables = csv.data.variables.map(clone)
        dataset.entityNames = csv.data.entityNames
        dataset.entities = csv.data.entities
        dataset.years = csv.data.years

        if (dataset.subcategoryId === undefined)
            dataset.subcategoryId = this.defaultSubcategoryId
    }

    @action.bound onSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        this.saveDataset()
    }

    // Grab existing dataset info to compare against what we are importing
    async getExistingDataset() {
        const {existingDatasetId} = this

        if (existingDatasetId) {
            const json = await this.context.admin.getJSON(`/api/importData/datasets/${existingDatasetId}.json`)

            runInAction(() => {
                this.dataset.update(json)
                this.fillDataset(this.dataset)
            })
        }
    }

    // Commit the import!
    saveDataset() {
        const { newVariables, entityNames, entities, years } = this.dataset

        const requestData = {
            dataset: {
                id: this.dataset.id,
                name: this.dataset.name,
                description: this.dataset.description,
                subcategoryId: this.dataset.subcategoryId
            },
            years, entityNames, entities,
            variables: newVariables
        }

        runInAction(() => {
            this.importError = undefined
            this.importSuccess = false
            this.importRequest = this.context.admin.requestJSON('/api/importDataset', requestData, "POST").then(() => {
                runInAction(() => this.importSuccess = true)
            })
        })
    }

    disposers: IReactionDisposer[] = []
    componentDidMount() {
        this.disposers.push(autorun(() => {
            if (this.existingDatasetId === undefined) {
                this.fillDataset(this.dataset)
            } else {
                this.getExistingDataset()
            }
        }))
    }

    componentWillUnmount() {
        for (const dispose of this.disposers)
            dispose()
    }

    @computed get defaultSubcategoryId(): number {
        const uncategorized = this.props.categories.find(c => c.name === "Uncategorized") as { id: number, name: string }
        return uncategorized.id
    }

    render() {
        const { csv, dataset, existingDatasetId } = this
        const { datasets, categories, existingEntities } = this.props

        return <form className={styles.importer} onSubmit={this.onSubmit}>
            <h2>Import CSV file</h2>
            <p>Examples of valid layouts: <a href="http://ourworldindata.org/wp-content/uploads/2016/02/ourworldindata_single-var.png">single variable</a>, <a href="http://ourworldindata.org/wp-content/uploads/2016/02/ourworldindata_multi-var.png">multiple variables</a>. The multivar layout is preferred. <span className="form-section-desc">CSV files only: <a href="https://ourworldindata.org/how-to-our-world-in-data-guide/#1-2-single-variable-datasets">csv file format guide</a></span></p>
            <CSVSelector onCSV={this.onCSV} existingEntities={existingEntities} />

            {csv && csv.isValid && <section>
                <p style={{ opacity: dataset.id !== undefined ? 1 : 0 }} className="updateWarning">Overwriting existing dataset</p>
                <NumericSelectField value={existingDatasetId} onValue={this.onChooseDataset}
                    options={[-1].concat(datasets.map(d => d.id))}
                    optionLabels={["Create new dataset"].concat(datasets.map(d => d.name))}/>
                <hr />

                <h3>Dataset name and description</h3>
                <p>The dataset name and description are currently not shown on charts, but will become public in the future.</p>
                <BindString field="name" store={dataset} helpText={`Dataset name should include a basic description of the variables, followed by the source and year. For example: "Government Revenue Data – ICTD (2016)"`}/>
                <hr />
                <BindString field="description" store={dataset}/>
                <hr />
                <EditCategory dataset={dataset} categories={categories} />
                <hr />
                <EditSource dataset={dataset}/>

                {dataset.isLoading && <i className="fa fa-spinner fa-spin"></i>}
                {!dataset.isLoading && [
                    <EditVariables dataset={dataset} />,
                    <input type="submit" className="btn btn-success" value={dataset.id ? "Update dataset" : "Create dataset"} />,
                    this.importRequest && <ImportProgressModal dataset={dataset} onDismiss={() => this.importRequest = undefined} importError={this.importError} importSuccess={this.importSuccess}/>
                ]}
            </section>}
        </form>
    }
}

interface ImportPageData {
    datasets: { 
        id: number
        name: string 
    }[]
    categories: {
        id: number
        name: string
        parent: string
    }[]
    existingEntities: string[]
}

@observer
export default class ImportPage extends React.Component {
    context!: { admin: Admin }

    @observable importData?: ImportPageData

    async getData() {
        const json = await this.context.admin.getJSON("/api/importData.json")
        runInAction(() => this.importData = json as ImportPageData)
    }

    componentDidMount() {
        this.getData()
    }

    render() {
        return <AdminLayout>
            <main className="ImportPage">
                {this.importData && <Importer {...this.importData}/>}
            </main>
        </AdminLayout>
    }
}

