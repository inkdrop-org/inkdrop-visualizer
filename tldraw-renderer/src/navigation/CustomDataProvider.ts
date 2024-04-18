import {
    Disposable,
    ExplicitDataSource,
    TreeDataProvider,
    TreeItem,
    TreeItemIndex
} from 'react-complex-tree'

export default class CustomDataProvider<T = any> implements TreeDataProvider {
    private data: ExplicitDataSource

    private handlers: Record<string, (changedItemIds: TreeItemIndex[]) => void> = {};

    private setItemName?: (item: TreeItem<T>, newName: string) => TreeItem<T>

    constructor(
        items: Record<TreeItemIndex, TreeItem<T>>,
        setItemName?: (item: TreeItem<T>, newName: string) => TreeItem<T>
    ) {
        this.data = { items }
        this.setItemName = setItemName
    }

    public async getTreeItem(itemId: TreeItemIndex): Promise<TreeItem> {
        return this.data.items[itemId]
    }

    public async onChangeItemChildren(
        itemId: TreeItemIndex,
        newChildren: TreeItemIndex[]
    ): Promise<void> {
        this.data.items[itemId].children = newChildren
        this.data.items[itemId].isFolder = (newChildren.length > 0)
        Object.values(this.handlers).forEach(handler => handler([itemId]))
    }

    public onDidChangeTreeData(
        listener: (changedItemIds: TreeItemIndex[]) => void
    ): Disposable {
        const id = (Math.random() + 1).toString(36).substring(7)
        this.handlers[id] = listener
        return { dispose: () => delete this.handlers[id] }
    }

    public async onRenameItem(item: TreeItem<any>, name: string): Promise<void> {
        if (this.setItemName) {
            this.data.items[item.index] = this.setItemName(item, name)
        }
    }

    public resetData(items: Record<TreeItemIndex, TreeItem<T>>): void {
        this.data = { items }
    }
}