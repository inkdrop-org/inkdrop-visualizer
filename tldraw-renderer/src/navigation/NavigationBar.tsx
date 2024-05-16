import { UncontrolledTreeEnvironment, Tree, TreeRef } from 'react-complex-tree';
import CustomDataProvider from './CustomDataProvider';
import 'react-complex-tree/lib/style-modern.css';
import { MutableRefObject, useEffect, useRef, useState } from 'react';
import { readTemplate } from './ModuleTree';
import { Checkbox, Drawer, FormControlLabel, FormGroup, IconButton, Tooltip } from '@mui/material';
import { NodeGroup, RenderInput, Tag } from '../TLDWrapper';
import "./NavigationBar.css"

interface NavigationBarProps {
    modulesTree: any
    filtersTree: any
    selectModule: (module: string) => void
    selectResource: (resourceType: string, resourceName: string) => void
    selectedModule: string
    nodeGroups: NodeGroup[] | undefined
    renderInput: RenderInput | undefined
    selectedTagsRef: MutableRefObject<string[]>
    deselectedCategoriesRef: MutableRefObject<string[]>
    refreshWhiteboard: () => void
}

const NavigationBar = ({
    modulesTree,
    filtersTree,
    selectModule,
    selectResource,
    nodeGroups,
    renderInput,
    selectedTagsRef,
    deselectedCategoriesRef,
    refreshWhiteboard
}: NavigationBarProps) => {

    const [modulesTreeItems, setModulesTreeItems] = useState(readTemplate({
        root: null,
    }).items)
    const [filtersTreeItems, setFiltersTreeItems] = useState(readTemplate({
        root: null,
    }).items)
    const treeRef = useRef<TreeRef<any>>(null)
    const filtersTreeRef = useRef<TreeRef<any>>(null)

    const modulesDataProvider = new CustomDataProvider(modulesTreeItems, (item, data) => ({
        ...item,
        data,
    }))

    const filtersDataProvider = new CustomDataProvider(filtersTreeItems, (item, data) => ({
        ...item,
        data,
    }))

    useEffect(() => {
        if (!modulesTree || modulesTree.root === null) return
        const refreshTreeChildren = async () => {
            const newItems = readTemplate(modulesTree).items
            setModulesTreeItems(newItems)
            const promises = Object.entries(newItems).map(async ([index, item]: [any, any]) => {
                if (item && item.children && item.children.length > 0) {
                    return modulesDataProvider.onChangeItemChildren(index, item.children)
                }
                return Promise.resolve()
            })

            await Promise.all(promises)
        }
        refreshTreeChildren()
    }, [modulesTree])

    useEffect(() => {
        if (!filtersTree) return
        const refreshTreeChildren = async () => {
            const newItems = readTemplate(filtersTree).items
            setFiltersTreeItems(newItems)
            const promises = Object.entries(newItems).map(async ([index, item]: [any, any]) => {
                if (item && item.children && item.children.length > 0) {
                    return filtersDataProvider.onChangeItemChildren(index, item.children)
                }
                return Promise.resolve()
            })

            await Promise.all(promises)
        }
        refreshTreeChildren()
    }, [filtersTree])

    const handleItemSelect = (items: string[]) => {
        const selected = items[0].split("/")[items[0].split("/").length - 1]
        setTimeout(() => {
            if (selected.includes(".")) {
                const [resourceType, resourceName] = selected.split(".")
                selectResource(resourceType, resourceName)
            } else {
                selectModule(selected)
            }
        }, 100)

    }

    const handleFilterSelect = (items: string[]) => {
        if (items.length === 0) return
        const selected = items[0]
        if (selected) {
            if (selected.includes("/root/Select Filters/Categories/")) {
                toggleCategory(selected.split("/")[4])
            } else if (selected.includes("/root/Select Filters/Tags/")) {
                toggleTag(selected.split("/")[4])
            }
        }
        filtersTreeRef.current?.selectItems([])
    }

    const toggleShowUnchanged = async () => {
        renderInput!.showUnchanged = !renderInput?.showUnchanged
        refreshWhiteboard()
    }

    const toggleCategory = (category: string) => {
        if (deselectedCategoriesRef.current.includes(category)) {
            deselectedCategoriesRef.current = deselectedCategoriesRef.current.filter((cat) => {
                return cat !== category
            })
        } else {
            deselectedCategoriesRef.current.push(category)
        }
        refreshWhiteboard()
    }

    const toggleTag = (tag: string) => {
        if (selectedTagsRef.current.includes(tag)) {
            selectedTagsRef.current = selectedTagsRef.current.filter((t) => {
                return t !== tag
            })
        } else {
            selectedTagsRef.current.push(tag)
        }
        refreshWhiteboard()
    }

    return (
        <Drawer
            anchor="left"
            variant="persistent"
            open={true}
            sx={{
                display: 'flex',
                flexDirection: 'column',
                height: '100vh',  // Make sure the drawer takes full viewport height
                "& .MuiPaper-root": {
                    width: '14rem',
                    overflow: 'hidden',
                    backgroundColor: "#F7F7F8",
                    borderRight: "1px solid",
                    zIndex: 2001,
                    boxSizing: 'border-box'
                },
            }}
        >
            <div className='flex'>
                <div className='pl-3 h-[2.4rem] table grow'>
                    <div className={"max-w-full text-xl table-cell align-middle"}>
                        {"Explorer"}
                    </div>
                </div>
            </div>
            <div className="w-[12.5rem] h-[1px] ml-3 bg-[#B2AEB6]" />
            <div className='flex-grow overflow-x-hidden'>
                <UncontrolledTreeEnvironment
                    onSelectItems={(items) => { handleFilterSelect(items as string[]) }}
                    dataProvider={filtersDataProvider}
                    getItemTitle={item => item.data}
                    viewState={{}}
                    renderItemTitle={({ title, item }) => {
                        return <div key={item.index} className="w-full flex items-center">
                            {!item.isFolder &&
                                <Checkbox size='small'
                                    disableRipple
                                    sx={{
                                        padding: "0 0.25rem 0 0",
                                    }}
                                    checked={
                                        (item.index as string).includes("/root/Select Filters/Categories/") ? !deselectedCategoriesRef.current.includes((item.index as string).split("/")[4]) :
                                            (item.index as string).includes("/root/Select Filters/Tags/") ? selectedTagsRef.current.includes((item.index as string).split("/")[4]) : false
                                    } />
                            }
                            {item.index === "/root/Select Filters" ?
                                <div className={"leading-[2.4rem]"}>
                                    <span className="grow truncate inline-block align-middle text-sm">{title}</span>
                                </div> :
                                (item.index as string).split("/").length === 4 ?
                                    < span className="grow truncate text-sm">{title}</span> :
                                    < span className="grow truncate text-[10px]">{title}</span>
                            }
                        </div>
                    }}
                >
                    <Tree treeId="filters-tree" rootItem="/root" treeLabel="Filters tree" ref={filtersTreeRef} />
                </UncontrolledTreeEnvironment>
                <div className="w-[12.5rem] h-[1px] bg-[#B2AEB6] mr-3 ml-3" />
                {nodeGroups && nodeGroups.length > 0 &&
                    <>
                        <div className='text-lg ml-3 leading-[2.4rem]'>
                            <span className='inline-block align-middle text-sm'>
                                Navigation
                            </span>
                        </div>
                        <UncontrolledTreeEnvironment
                            onSelectItems={(items) => { handleItemSelect(items as string[]) }}
                            disableMultiselect
                            dataProvider={
                                modulesDataProvider
                            }
                            getItemTitle={item => item.data}
                            viewState={{}}
                            renderItemTitle={({ title, item }) => {
                                const nodeGroup = nodeGroups?.find((nodeGroup) => {
                                    const [resourceType, resourceName] = item.index.toString().split("/")[item.index.toString().split("/").length - 1].split(".");
                                    const module = item.index.toString().split("/")[item.index.toString().split("/").length - 2];
                                    const parentModules = item.index.toString().split("/").slice(2, -2);
                                    return nodeGroup.moduleName === module && nodeGroup.type === resourceType && nodeGroup.name === resourceName && nodeGroup.parentModules.join() === parentModules.join();
                                })
                                return <div key={item.index} className="w-full flex items-center">
                                    {item.isFolder ?
                                        <div className='text-base font-bold mr-[0.3rem]'>M</div> :
                                        <img src={nodeGroup?.iconPath} alt={nodeGroup?.name} className="w-4 h-4 mr-[0.3rem] rounded-sm" />
                                    }
                                    < span className="grow truncate text-[10px]">{title}</span>
                                </div>
                            }}
                        >
                            <Tree treeId="modules-tree" rootItem="/root" treeLabel="Modules tree" ref={treeRef} />
                        </UncontrolledTreeEnvironment>
                    </>
                }
            </div>

            <div className="w-[12.5rem] mt-2 h-[1px] bg-[#B2AEB6] mr-3 ml-3" />
            {renderInput &&
                <FormGroup>
                    <FormControlLabel
                        checked={renderInput?.showUnchanged}
                        sx={{
                            height: "2.4rem",
                            margin: "0 0 0 0.75rem",
                            "& .MuiCheckbox-root": {
                                padding: 0,
                                paddingRight: "0.25rem",
                            },
                            "& .MuiTypography-body1": {
                                fontSize: "0.875rem"
                            }
                        }} onChange={() => toggleShowUnchanged()} control={<Checkbox
                            disableRipple
                        />} label="Show unchanged" />
                </FormGroup>
            }
        </Drawer >
    )
}

export default NavigationBar;