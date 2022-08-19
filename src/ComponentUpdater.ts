import * as ko from "knockout";

import {Eagle} from './Eagle';
import {LogicalGraph} from './LogicalGraph';
import {Utils} from './Utils';

export class ComponentUpdater {

    static update(graph: LogicalGraph, callback : (error : string, data : string) => void) : void {

        const tableData: any[] = [];

        for (const node of graph.getNodes()){
            tableData.push({
                name:node.getName(),
                repositoryUrl:node.getRepositoryUrl(),
                commitHash:node.getCommitHash(),
                paletteDownloadUrl:node.getPaletteDownloadUrl(),
                dataHash:node.getDataHash()
            });
        }

        console.table(tableData);

        

    }
}
