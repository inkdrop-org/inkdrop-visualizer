import { useCallback, useEffect, useRef, useState } from 'react';
import { NodeShapeUtil } from './board/NodeShape';
import { Editor, TLStoreOptions, Tldraw, createTLStore, defaultShapeUtils } from '@tldraw/tldraw';
import Papa from "papaparse"
import { getAssetUrls } from '@tldraw/assets/selfHosted';
import { NodeModel, RootGraphModel, SubgraphModel, fromDot } from "ts-graphviz"
import { terraformResourcesCsv } from './terraformResourcesCsv';
import '@tldraw/tldraw/tldraw.css'
import { fetchIsDemo, getRenderInput, sendData, sendDebugLog } from './utils/storage';
import { computeLayout } from './layout/computeLayout';
import { getExtendedModuleName, getVariablesAndOutputs, resourceDependencies } from './dependencies/dependencies';
import { getResourceNameAndType } from './utils/resources';
import { filterOutNotNeededArgs } from './utils/filterPlanJson';
import { demoShapes } from './layout/demoShapes';
import SelectionHandler from './selection/SelectionHandler';
import { getMacroCategory } from './utils/awsCategories';


const customShapeUtils = [NodeShapeUtil]

type ResourceState = "no-op" | "create" | "read" | "update" | "delete" | "delete-create" | "create-delete"

export type NodeGroup = {
    nodes: {
        nodeModel: NodeModel,
        name: string,
        type: string,
        resourceChanges?: any[]
    }[],
    id: string,
    mainNode: NodeModel,
    connectionsOut: string[],
    connectionsIn: string[],
    moduleConnectionsIn: string[],
    moduleConnectionsOut: string[],
    variableRefs?: string[],
    outputRefs?: string[],
    affectedOutputs?: string[],
    numberOfChanges: number,
    name: string,
    type: string,
    category: string,
    iconPath: string,
    serviceName: string
    moduleName?: string
    parentModules: string[]
    state: ResourceState
    shapeId?: string
    frameShapeId?: string
    stateFile: string
}

export type TFVariableOutput = {
    name: string,
    module: string,
    type: "variable" | "output",
    expressionReferences: {
        type: "variable" | "output" | "resource",
        module: string,
        name: string
    }[]
}

export type Tag = {
    name: string,
    value: string
}

type State = {
    name: string,
    state: string,
    graph: string
}

export type RenderInput = {
    planJson: string,
    graph: string,
    detailed: boolean,
    debug: boolean,
    showUnchanged: boolean,
    ci: boolean,
    opacityFull: boolean,
    states?: State[]
}

const assetUrls = getAssetUrls()

const TLDWrapper = () => {

    const [editor, setEditor] = useState<Editor | null>(null)
    const [renderInput, setRenderInput] = useState<RenderInput>()
    const tagsRef = useRef<Tag[]>([])
    const selectedTagsRef = useRef<string[]>([])
    const initializedRef = useRef<boolean>(false)
    const categoriesRef = useRef<string[]>([])
    const showDebugRef = useRef<boolean>(false)
    const deselectedCategoriesRef = useRef<string[]>([])
    const [sidebarWidth, setSidebarWidth] = useState<number>(0)
    const [shapesSnapshot, setShapesSnapshot] = useState<string>("")
    const [storedNodeGroups, setStoredNodeGroups] = useState<NodeGroup[]>()
    const [variables, setVariables] = useState<TFVariableOutput[]>([])
    const [outputs, setOutputs] = useState<TFVariableOutput[]>([])

    useEffect(() => {
        if (!renderInput || !editor || initializedRef.current) return
        showDebugRef.current = renderInput.debug
        const detailed = renderInput.detailed
        debugLog("Detailed view is " + (detailed ? "on" : "off") + ".")
        const showUnchanged = renderInput.showUnchanged
        renderInput.planJson &&
            debugLog("Unchanged resources are " + (showUnchanged ? "shown" : "hidden") + ".")
        const opacityFull = renderInput.opacityFull
        debugLog("Full opacity for unchanged resources is " + (opacityFull ? "on" : "off") + ".")
        const model = fromDot(renderInput.graph)
        parseModel(model, false)
    }, [renderInput, editor])

    // Forward logs in --debug mode
    useEffect(() => {
        const originalConsoleLog = console.log;
        const originalConsoleWarn = console.warn;
        const originalConsoleError = console.error;

        console.log = (...args: any[]) => {
            if (showDebugRef.current && !initializedRef.current) {
                sendDebugLog("LOG: " + args.join(" "))
            }
            originalConsoleLog.apply(console, args);
        };

        console.warn = (...args: any[]) => {
            if (showDebugRef.current) {
                sendDebugLog("WARN: " + args.join(" "))
            }
            originalConsoleWarn.apply(console, args);
        };

        console.error = (...args: any[]) => {
            if (showDebugRef.current) {
                sendDebugLog("ERR: " + args.join(" "))
            }
            originalConsoleError.apply(console, args);
        };

        return () => {
            console.log = originalConsoleLog;
            console.warn = originalConsoleWarn;
            console.error = originalConsoleError;
        };
    }, []);

    const setAppToState = useCallback((editor: Editor) => {
        setEditor(editor)
    }, [])

    const [store] = useState(() => createTLStore({
        shapeUtils: [...customShapeUtils, ...defaultShapeUtils],
        history: undefined
    } as TLStoreOptions))

    useEffect(() => {
        const getStoredInput = async () => {
            const data: RenderInput = await getRenderInput()
            if (Object.keys(data).length > 0) {
                setRenderInput(data)
            }
        }
        getStoredInput()
    }, [])

    const debugLog = (message: string) => {
        if (!showDebugRef.current) return
        console.log(message)
    }

    const checkHclBlockType = (blockId: string) => {
        let parentModules: string[] = []
        let moduleName = ""

        let splitBlockId = blockId.split(".")
        for (let i = 0; i < splitBlockId.length; i++) {
            if (splitBlockId[i] === "module") {
                if (moduleName !== "") {
                    parentModules.push(moduleName)
                }
                moduleName = splitBlockId[i + 1]
                blockId = splitBlockId.slice(i + 2).join(".")
            }
        }
        const isModule = !blockId && moduleName


        const isData = blockId.startsWith("data.")
        const isVariable = blockId.startsWith("var.")
        const isLocal = blockId.startsWith("local.")
        const isOutput = blockId.startsWith("output.")
        const isProvider = blockId.startsWith("provider[")

        const isResource = blockId.startsWith("aws_") || blockId.startsWith("google_") || blockId.startsWith("azurerm_")

        if (!isData && !isVariable && !isLocal && !isOutput && !isProvider && !isResource && !isModule) {
            console.warn("Unknown block type", blockId)
        }

        splitBlockId = blockId.split(".")
        const isResourceWithName = isResource && splitBlockId.length > 1
        if (!isResource && !isModule) {
            blockId = splitBlockId.slice(1).join(".")
        }
        return { processedBlockId: blockId, isData, isVariable, isResource, isLocal, isOutput, isProvider, isModule, isResourceWithName, moduleName, parentModules }
    }

    const transformIntoPlanFormat = (stateData: State[]) => {
        const resourceChanges: any[] = []
        stateData.forEach((s) => resourceChanges.push(
            ...JSON.parse(s.state).resources.map((resource: any) => {
                const addressBase = resource.module ? `${resource.module}.` : '';
                const address = `${addressBase}${resource.type}.${resource.name}`;
                const providerName = resource.provider.replace('provider["', '').replace('"]', '');

                const change = {
                    actions: ["no-op"],
                    before: resource.instances[0].attributes,
                    after: resource.instances[0].attributes,
                };

                return {
                    address,
                    module_address: resource.module ? `.${resource.module}` : '',
                    mode: resource.mode,
                    type: resource.type,
                    name: resource.name,
                    provider_name: providerName,
                    inkdrop_metadata: {
                        state_name: s.name,
                    },
                    change
                };
            })));

        return {
            resource_changes: resourceChanges
        };
    }


    const addNodeToGroup = (node: NodeModel, nodeGroups: Map<string, NodeGroup>, mainBlock: boolean, jsonArray?: Papa.ParseResult<unknown>, planJsonObj?: any, computeTerraformPlan?: boolean) => {
        let centralPart = node.id.split(" ")[1]
        if (centralPart) {
            const { processedBlockId, isResourceWithName, moduleName, parentModules } = checkHclBlockType(centralPart)

            if (isResourceWithName) {
                const { resourceType, resourceName } = getResourceNameAndType(processedBlockId)
                let stateFile = ""
                if (resourceType && resourceName && jsonArray) {
                    let resourceChanges: any[] = []
                    resourceChanges = planJsonObj?.resource_changes?.filter((resource: any) => {
                        return resource.address === node.id.split(" ")[1] || resource.address.startsWith(node.id.split(" ")[1] + "[")
                    })
                    if (resourceChanges.length > 0) {
                        stateFile = resourceChanges[0].inkdrop_metadata?.state_name || ""
                    }
                    if (!computeTerraformPlan) {
                        resourceChanges = []
                    }

                    let numberOfChanges = 0

                    // Determine a general state, given all the actions
                    let generalState = "no-op"
                    resourceChanges?.forEach((resourceChange) => {
                        const newState = resourceChange.change.actions.join("-")
                        numberOfChanges += ["no-op", "read"].includes(newState) ? 0 : 1
                        generalState = newState !== generalState ?
                            (["no-op", "read"].includes(newState) && ["no-op", "read"].includes(generalState)) ? "read" :
                                ["no-op", "read"].includes(generalState) ? newState : "update" : newState
                    })


                    jsonArray.data.forEach((row: any) => {
                        if (row[mainBlock ? "Main Diagram Blocks" : "Secondary Diagram Blocks"].split(",").some((s: string) => s === resourceType)) {
                            debugLog("Adding main resource: " + node.id.split(" ")[1])
                            nodeGroups.set(node.id.split(" ")[1], {
                                nodes: [{
                                    nodeModel: node,
                                    name: resourceName,
                                    type: resourceType,
                                    resourceChanges: resourceChanges
                                }],
                                id: node.id.split(" ")[1],
                                mainNode: node,
                                category: row["Simplified Category"],
                                name: resourceName,
                                state: resourceChanges.length > 0 ? generalState as ResourceState : "no-op",
                                type: resourceType,
                                parentModules: parentModules,
                                numberOfChanges: numberOfChanges,
                                serviceName: row["Service Name"],
                                iconPath: row["Icon Path"].trim(),
                                connectionsIn: [],
                                connectionsOut: [],
                                moduleConnectionsIn: [],
                                moduleConnectionsOut: [],
                                moduleName: moduleName,
                                stateFile: stateFile
                            })
                        }
                    })

                }
            }
        }

    }

    const findAndSetCategories = (nodeGroups: Map<string, NodeGroup>) => {
        const catList: string[] = []
        nodeGroups.forEach((nodeGroup, key) => {
            const macroCategory = getMacroCategory(nodeGroup.category)
            if (!catList.includes(macroCategory)) {
                catList.push(macroCategory)
            }
        })

        //sort alphabetically
        catList.sort((a, b) => {
            const newA = a === "Other" ? "zzz" : a
            const newB = b === "Other" ? "zzz" : b
            if (newA < newB) return -1
            if (newA > newB) return 1
            return 0
        })

        categoriesRef.current = catList
    }

    const findAndSetTags = (nodeGroups: Map<string, NodeGroup>) => {
        const tags: Tag[] = []
        nodeGroups.forEach((nodeGroup, key) => {
            nodeGroup.nodes.forEach((node) => {
                if (node.resourceChanges && node.resourceChanges.length > 0) {
                    const resourceChanges = node.resourceChanges
                    resourceChanges.forEach((resourceChange) => {
                        const tagsToAdd = Object.entries(resourceChange.change?.after?.tags_all || {}).map(([key, value]) => {
                            return { name: key as string, value: value as string }
                        })
                        if (tagsToAdd) {
                            tags.push(...tagsToAdd)
                        }
                    })
                }
            })
        })
        tagsRef.current = tags
    }

    const parseModel = async (model: RootGraphModel, refreshFromToggle?: boolean) => {
        const computeTerraformPlan = (renderInput?.planJson && renderInput?.planJson !== "") ? true : false
        const remoteModels = renderInput?.states?.map((state) => {
            return fromDot(state.graph)
        })
        debugLog("Aggregating multiple states graphs...")
        remoteModels?.forEach((remoteModel) => {
            remoteModel.subgraphs[0].nodes.forEach((node) => {
                model.subgraphs[0].addNode(node)
            })
            remoteModel.subgraphs[0].edges.forEach((edge) => {
                model.subgraphs[0].addEdge(edge)
            })
        })
        debugLog(computeTerraformPlan ? "Terraform plan detected." : "No Terraform plan detected. Using static data.")
        let planJsonObj: any = filterOutNotNeededArgs(computeTerraformPlan ?
            typeof renderInput?.planJson === "string" ? JSON.parse(renderInput?.planJson!) : renderInput?.planJson : undefined)
        const remoteStateJsonObj = transformIntoPlanFormat(renderInput?.states || [])

        planJsonObj = {
            ...planJsonObj,
            resource_changes: [...planJsonObj?.resource_changes || [], ...remoteStateJsonObj?.resource_changes || []]
        }

        const nodeGroups = new Map<string, NodeGroup>()
        const jsonArray = Papa.parse(terraformResourcesCsv, { delimiter: ",", header: true })

        debugLog("Adding main resources...")
        model.subgraphs.forEach((subgraph) => {
            subgraph.nodes.forEach((node) => {
                addNodeToGroup(node, nodeGroups, true, jsonArray, planJsonObj, computeTerraformPlan)
            })
        })

        debugLog("Adding main resources... Done.")

        debugLog("Aggregating secondary resources...")
        nodeGroups.forEach((nodeGroup) => {
            getConnectedNodes(nodeGroup.mainNode, nodeGroup, nodeGroups, model.subgraphs[0], true, jsonArray, planJsonObj)
            getConnectedNodes(nodeGroup.mainNode, nodeGroup, nodeGroups, model.subgraphs[0], false, jsonArray, planJsonObj)
        })
        debugLog("Aggregating secondary resources... Done.")

        if (renderInput?.detailed) {
            debugLog("Adding unconnected resources (detailed view)...")
            // Add a nodeGroup for each node that is not connected to any other node
            model.subgraphs[0].nodes.forEach((node) => {
                if (!Array.from(nodeGroups.values()).some((group) => {
                    return group.nodes.some((n) => {
                        return n.nodeModel.id === node.id
                    })
                })) {
                    addNodeToGroup(node, nodeGroups, false, jsonArray, planJsonObj, computeTerraformPlan)
                }
            })
            debugLog("Adding unconnected resources (detailed view)... Done.")
        }

        if (computeTerraformPlan) {
            debugLog("Removing inactive resources...")
            // Remove nodeGroups whose first node has no resourceChanges
            Array.from(nodeGroups.keys()).forEach((key) => {
                const nodeGroup = nodeGroups.get(key)
                if (nodeGroup && nodeGroup.nodes[0].resourceChanges && nodeGroup.nodes[0].resourceChanges.length === 0) {
                    debugLog("Removing inactive main resource: " + nodeGroup.id)
                    nodeGroups.delete(key)
                }
            })
            // Remove nodes whose resourceChanges are empty
            nodeGroups.forEach((nodeGroup) => {
                nodeGroup.nodes = nodeGroup.nodes.filter((node) => {
                    const keep = node.resourceChanges && node.resourceChanges.length > 0
                    if (!keep) {
                        debugLog("Removing inactive secondary resource: " + node.nodeModel.id.split(" ")[1])
                    }
                    return keep
                })
            })
            debugLog("Removing inactive resources... Done.")
        }

        if (!renderInput?.showUnchanged && computeTerraformPlan) {
            debugLog("Removing unchanged resources...")
            // Remove nodeGroups whose first node has no resourceChanges
            Array.from(nodeGroups.keys()).forEach((key) => {
                const nodeGroup = nodeGroups.get(key)
                if (nodeGroup && nodeGroup.numberOfChanges === 0 && !nodeGroup.stateFile) {
                    debugLog("Removing unchanged main resource: " + nodeGroup.id)
                    nodeGroups.delete(key)
                }
            })
            // Remove nodes whose resourceChanges are empty
            nodeGroups.forEach((nodeGroup) => {
                if (!nodeGroup.stateFile) {
                    nodeGroup.nodes = nodeGroup.nodes.filter((node) => {
                        const keep = node.resourceChanges && node.resourceChanges.some((resourceChange) => {
                            const actions = resourceChange.change.actions
                            return actions.length > 0 && actions.some((action: string) => action !== "no-op" && action !== "read")
                        })
                        if (!keep) {
                            debugLog("Removing unchanged secondary resource: " + node.nodeModel.id.split(" ")[1])
                        }
                        return keep
                    })
                }
            })
            debugLog("Removing unchanged resources... Done.")
        }

        findAndSetCategories(nodeGroups)
        // Remove nodeGroups whose category is not selected
        Array.from(nodeGroups.keys()).forEach((key) => {
            const nodeGroup = nodeGroups.get(key)
            if (nodeGroup && deselectedCategoriesRef.current!.includes(getMacroCategory(nodeGroup.category))) {
                nodeGroups.delete(key)
            }
        })

        findAndSetTags(nodeGroups)
        if (selectedTagsRef.current.length > 0) {
            // Remove nodeGroups whose tags are not selected
            Array.from(nodeGroups.keys()).forEach((key) => {
                const nodeGroup = nodeGroups.get(key)
                if (nodeGroup && !nodeGroup.nodes.some((node) => {
                    return node.resourceChanges && node.resourceChanges.some((resourceChange) => {
                        return resourceChange.change?.after?.tags_all && Object.entries(resourceChange.change?.after?.tags_all || {}).some(([key, value]) => {
                            return selectedTagsRef.current.includes(key)
                        })
                    })
                })) {
                    nodeGroups.delete(key)
                }
            })
        }

        debugLog("Computing connections...")
        // Compute connections between groups
        model.subgraphs[0].edges.forEach((edge) => {
            const edgeFromId = (edge.targets[0] as any).id
            const edgeToId = (edge.targets[1] as any).id

            const fromGroup = Array.from(nodeGroups).filter(([id, group]) => {
                return group.nodes.some((n) => {
                    return n.nodeModel.id === edgeFromId
                })
            })[0]
            const toGroup = Array.from(nodeGroups).filter(([id, group]) => {
                return group.nodes.some((n) => {
                    return n.nodeModel.id === edgeToId
                })
            })[0]
            if (fromGroup && toGroup && fromGroup !== toGroup) {
                const fromGroupKey = fromGroup[0]
                const toGroupKey = toGroup[0]
                if (!fromGroup[1].connectionsIn.includes(toGroupKey) && !toGroup[1].connectionsOut.includes(fromGroupKey)) {
                    fromGroup[1].connectionsIn.push(toGroupKey)
                    toGroup[1].connectionsOut.push(fromGroupKey)
                }
            }
        })
        debugLog("Computing connections... Done.")

        const { variables, outputs } = computeTerraformPlan ? getVariablesAndOutputs(nodeGroups, planJsonObj) :
            { variables: [], outputs: [] }
        setVariables(variables)
        setOutputs(outputs)

        computeVarOutDependencies(nodeGroups, variables, outputs)

        computeLayout(nodeGroups, computeTerraformPlan, editor, renderInput?.opacityFull || false)
        setShapesSnapshot(JSON.stringify(editor?.getCurrentPageShapes()))

        const isDemo = await fetchIsDemo()
        if (isDemo && !refreshFromToggle) {
            editor?.createShapes(demoShapes as any)
        }

        editor?.zoomToContent()
        initializedRef.current = true

        if (renderInput?.ci) {
            sendData({
                ...renderInput,
                planJson: planJsonObj
            })
        }

        setStoredNodeGroups(Array.from(nodeGroups.values()))
    }


    const computeVarOutDependencies = (nodeGroups: Map<string, NodeGroup>, variables: TFVariableOutput[], outputs: TFVariableOutput[]) => {
        nodeGroups.forEach((nodeGroup) => {
            const { dependencies, affected } = resourceDependencies(Array.from(nodeGroups.values()), nodeGroup, variables, outputs)
            dependencies.forEach((dep) => {
                if (dep.module !== "root_module" && dep.module !== getExtendedModuleName(nodeGroup)) {
                    if (!nodeGroup.moduleConnectionsIn.includes(dep.module)) {
                        nodeGroup.moduleConnectionsIn.push(dep.module)
                    }
                }
            })
            affected.forEach((dep) => {
                if (dep.module !== "root_module" && dep.module !== getExtendedModuleName(nodeGroup)) {
                    if (!nodeGroup.moduleConnectionsOut.includes(dep.module)) {
                        nodeGroup.moduleConnectionsOut.push(dep.module)
                    }
                }
            })
        })
    }


    const getConnectedNodes = (node: NodeModel, nodeGroup: NodeGroup, nodeGroups: Map<string, NodeGroup>, subgraph: SubgraphModel, start: boolean, jsonArray: Papa.ParseResult<unknown>, planJsonObj: any) => {
        subgraph.edges.filter((e) => {
            return (e.targets[start ? 0 : 1] as any).id === node.id
        }).forEach((edge, index) => {

            const edgeToId = (edge.targets[start ? 1 : 0] as any).id
            let centralPart = edgeToId.split(" ")[1]
            if (centralPart) {
                const { isResourceWithName, processedBlockId, isData } = checkHclBlockType(centralPart)

                if (isResourceWithName || isData) {
                    const { resourceType, resourceName } = getResourceNameAndType(processedBlockId)
                    const isNodePresent = Array.from(nodeGroups.values()).some((group) => {
                        return group.nodes.some((n) => {
                            return n.nodeModel.id === (edge.targets[start ? 1 : 0] as any).id
                        })
                    })
                    if (resourceType && resourceName && jsonArray && !isNodePresent &&
                        jsonArray.data.some((row: any) => {
                            return row["Main Diagram Blocks"].split(",").some((s: string) => s === nodeGroup.type) &&
                                (row["Secondary Diagram Blocks"].split(",").some((s: string) => s === resourceType) ||
                                    row["Data Sources"].split(",").some((s: string) => s === resourceType))
                        })) {
                        const newNode = subgraph.nodes.filter((n) => { return n.id === (edge.targets[start ? 1 : 0] as any).id })[0]
                        if (newNode) {

                            let resourceChanges: any[] = []
                            if (planJsonObj) {

                                resourceChanges = planJsonObj.resource_changes.filter((resource: any) => {
                                    return resource.address === newNode.id.split(" ")[1] || resource.address.startsWith(newNode.id.split(" ")[1] + "[")
                                })
                            }

                            let numberOfChanges = 0

                            // Determine a general state, given all the actions
                            let generalState = "no-op"
                            resourceChanges?.forEach((resourceChange) => {
                                const newState = resourceChange.change.actions.join("-")
                                numberOfChanges += ["no-op", "read"].includes(newState) ? 0 : 1
                                generalState = newState !== generalState ?
                                    (["no-op", "read"].includes(newState) && ["no-op", "read"].includes(generalState)) ? "read" : "update" : newState
                            })

                            nodeGroup.numberOfChanges += numberOfChanges

                            debugLog("Aggregating resource: " + newNode.id.split(" ")[1] + "\t->\t" + nodeGroup.id)

                            nodeGroup.nodes.push({
                                nodeModel: newNode,
                                name: resourceName,
                                type: resourceType,
                                resourceChanges: resourceChanges
                            })

                            nodeGroup.state = nodeGroup.state !== "no-op" || !planJsonObj ? nodeGroup.state :
                                generalState !== "no-op" ? "update" : generalState
                            getConnectedNodes(newNode, nodeGroup, nodeGroups, subgraph, start, jsonArray, planJsonObj)
                            getConnectedNodes(newNode, nodeGroup, nodeGroups, subgraph, !start, jsonArray, planJsonObj)
                        }

                    }
                }
            }
        })
    }

    const refreshWhiteboard = () => {
        editor?.deleteShapes(Array.from(editor.getPageShapeIds(editor.getCurrentPageId())))
        const model = fromDot(renderInput?.graph || "")
        parseModel(model, true)
    }


    const setShowSidebar = (value: boolean) => {
        setSidebarWidth(value ? 23 : 0)
    }


    return (
        <div style={{
            position: "fixed",
            inset: 0,
        }}>
            <div className={'h-full transition-all'} style={{
                marginLeft: "14rem",
                marginRight: sidebarWidth + "rem"
            }}
            >
                <Tldraw
                    shapeUtils={customShapeUtils}
                    onMount={setAppToState}
                    store={store}
                    assetUrls={assetUrls}
                />
            </div>
            <SelectionHandler
                editor={editor}
                nodeGroups={storedNodeGroups}
                sidebarWidth={sidebarWidth}
                setShowSidebar={setShowSidebar}
                shapesSnapshot={shapesSnapshot}
                hasPlanJson={renderInput?.planJson ? true : false}
                variables={variables}
                outputs={outputs}
                refreshWhiteboard={refreshWhiteboard}
                selectedTagsRef={selectedTagsRef}
                categoriesRef={categoriesRef}
                deselectedCategoriesRef={deselectedCategoriesRef}
                renderInput={renderInput}
                tagsRef={tagsRef}
            />
        </div>
    );
};

export default TLDWrapper;