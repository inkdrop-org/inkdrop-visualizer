import { UncontrolledTreeEnvironment, Tree, TreeRef } from 'react-complex-tree';
import CustomDataProvider from './CustomDataProvider';
import 'react-complex-tree/lib/style-modern.css';
import { MutableRefObject, useEffect, useRef, useState } from 'react';
import { readTemplate } from './ModuleTree';
import { Checkbox, Drawer } from '@mui/material';
import { NodeGroup, RenderInput, Tag } from '../TLDWrapper';

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

    const [modulesTreeItems, setModulesTreeItems] = useState(readTemplate(modulesTree).items)
    const [filtersTreeItems, setFiltersTreeItems] = useState(readTemplate(filtersTree).items)
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

    /*
    useEffect(() => {
        if (selectedModule) {
            const treeItems = modulesTreeItems.filter((item: any) => item.data === selectedModule)
            if (treeItems.length === 1) {
                treeRef.current?.selectItems([treeItems[0].index])
            }
        } else if (selectedResource) {
            const treeItems = modulesTreeItems.filter((item: any) => item.data === selectedResource.type + "." + selectedResource.name)
            if (treeItems.length === 1) {
                treeRef.current?.selectItems([treeItems[0].index])
            }
        }
    }, [selectedModule, selectedResource])
    */

    useEffect(() => {
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
        if (selected.includes(".")) {
            const [resourceType, resourceName] = selected.split(".")
            selectResource(resourceType, resourceName)
        } else {
            selectModule(selected)
        }
    }

    const handleFilterSelect = (items: string[]) => {
        if (items.length === 0) return
        const selected = items[0]
        if (selected) {
            if (selected === "/root/Select Filters/Debug/Unchanged resources") {
                toggleShowUnchanged()
            } else if (selected === "/root/Select Filters/Debug/Detailed diagram") {
                toggleDetailed()
            } else if (selected.includes("/root/Select Filters/Categories/")) {
                toggleCategory(selected.split("/")[4])
            } else if (selected.includes("/root/Select Filters/Tags/")) {
                toggleTag(selected.split("/")[4])
            }
        }
        filtersTreeRef.current?.selectItems([])
    }

    const toggleDetailed = async () => {
        renderInput!.detailed = !renderInput?.detailed
        refreshWhiteboard()
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
            anchor={"left"}
            variant="persistent"
            open={true}
            sx={{
                "& .MuiPaper-root": {
                    width: "14rem",
                    backgroundColor: "#F7F7F8",
                    borderRight: "1px solid",
                    zIndex: 2001
                },
            }}
        >
            <div className='pt-4 pl-4 pr-4'>
                <div className={"mb-1 max-w-full text-xl"}>
                    {"Explorer"}
                </div>
                <div className="w-[12rem] my-2 h-[1px] bg-[#B2AEB6]" />
            </div>
            <UncontrolledTreeEnvironment
                onSelectItems={(items) => { handleFilterSelect(items as string[]) }}
                dataProvider={filtersDataProvider}
                getItemTitle={item => item.data}
                viewState={{}}
                renderItemTitle={({ title, item }) => {
                    return <div key={item.index} className="w-full flex items-center">
                        {!item.isFolder &&
                            <input type="checkbox" className="w-4 h-4 mr-[0.3rem]" checked={
                                item.index === "/root/Select Filters/Debug/Unchanged resources" ? renderInput?.showUnchanged :
                                    item.index === "/root/Select Filters/Debug/Detailed diagram" ? renderInput?.detailed :
                                        (item.index as string).includes("/root/Select Filters/Categories/") ? !deselectedCategoriesRef.current.includes((item.index as string).split("/")[4]) :
                                            (item.index as string).includes("/root/Select Filters/Tags/") ? selectedTagsRef.current.includes((item.index as string).split("/")[4]) : false
                            } />
                        }
                        {item.index === "/root/Select Filters" ?
                            <span className="grow truncate text-lg">{title}</span> :
                            < span className="grow truncate">{title}</span>
                        }
                    </div>
                }}
            >
                <Tree treeId="filters-tree" rootItem="/root" treeLabel="Filters tree" ref={filtersTreeRef} />
            </UncontrolledTreeEnvironment>
            <div className="w-[12rem] my-2 h-[1px] bg-[#B2AEB6] mr-4 ml-4" />
            {nodeGroups && nodeGroups.length > 0 &&
                <>
                    <div className='text-lg ml-4'>Navigation</div>
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
                                < span className="grow truncate">{title}</span>
                            </div>
                        }}
                    >
                        <Tree treeId="modules-tree" rootItem="/root" treeLabel="Modules tree" ref={treeRef} />
                    </UncontrolledTreeEnvironment>
                </>
            }
        </Drawer >
    )
}

export default NavigationBar;