/*
#
#    ICRAR - International Centre for Radio Astronomy Research
#    (c) UWA - The University of Western Australia, 2016
#    Copyright by UWA (in the framework of the ICRAR)
#    All rights reserved
#
#    This library is free software; you can redistribute it and/or
#    modify it under the terms of the GNU Lesser General Public
#    License as published by the Free Software Foundation; either
#    version 2.1 of the License, or (at your option) any later version.
#
#    This library is distributed in the hope that it will be useful,
#    but WITHOUT ANY WARRANTY; without even the implied warranty of
#    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
#    Lesser General Public License for more details.
#
#    You should have received a copy of the GNU Lesser General Public
#    License along with this library; if not, write to the Free Software
#    Foundation, Inc., 59 Temple Place, Suite 330, Boston,
#    MA 02111-1307  USA
#
*/

import * as ko from "knockout";

import { Utils } from './Utils';
import { LogicalGraph } from "./LogicalGraph";
import { Edge } from "./Edge";
import { Node } from "./Node";
import { Errors } from "./Errors";
import { EagleConfig } from "./EagleConfig";

export class Visual {
    private id: ko.Observable<VisualId>;

    private x : ko.Observable<number>;
    private y : ko.Observable<number>;
    private width : ko.Observable<number>;
    private height : ko.Observable<number>;

    private type : ko.Observable<Visual.Type>;
    private content : ko.Observable<string>;
    private target : ko.Observable<Node | Edge | Visual | null>; // the id of the node or edge this comment is attached to, or null if it's free-floating
    private targetLocation : ko.Observable<{x:number, y:number}>; // the location on the target where the comment is attached, in target-local coordinates
    private color : ko.Observable<string>; //used for the background of group visuals

    constructor(type: Visual.Type, content: string) {
        this.id = ko.observable(Utils.generateVisualId());
        this.x = ko.observable(0);
        this.y = ko.observable(0);
        if(type === Visual.Type.Text){
            this.width = ko.observable(EagleConfig.TEXT_VISUAL_DEFAULT_WIDTH);
            this.height = ko.observable(EagleConfig.TEXT_VISUAL_DEFAULT_HEIGHT);
        }else if(type === Visual.Type.Group){
            this.width = ko.observable(EagleConfig.GROUP_VISUAL_DEFAULT_WIDTH);
            this.height = ko.observable(EagleConfig.GROUP_VISUAL_DEFAULT_HEIGHT);
        }
        this.type = ko.observable(type);
        this.content = ko.observable(content);
        this.target = ko.observable(null);
        this.targetLocation = ko.observable(null);
        this.color = ko.observable(EagleConfig.getColor('groupVisualBackgroundColor'))
    }

    getId = () : VisualId => {
        return this.id();
    }

    setId = (id: VisualId) : Visual => {
        this.id(id);
        return this;
    }

    getContent = () : string => {
        return this.content();
    }

    setContent = (content: string) : void => {
        this.content(content);
    }

    getContentHtml = () : string => {
        let contentHtml = this.content()
        if (contentHtml === undefined || contentHtml === null || contentHtml === ""){
            contentHtml = "Click on edit icon to add comment";
        }

        return Utils.markdown2html(contentHtml);
    }

    getPosition = () : {x:number, y:number} => {
        return {x: this.x(), y: this.y()};
    }

    setPosition = (x: number, y: number): Visual => {
        this.x(x)
        this.y(y)
        return this;
    }

    changePosition = (dx : number, dy : number) : Visual => {
        this.x(this.x()+dx)
        this.y(this.y()+dy)
        return this;
    }

    getHeight = () : number => {
        return this.height();
    }
    
    setHeight = (height: number) : Visual => {
        this.height(height);
        return this;
    }

    getWidth = () : number => {
        return this.width();
    }
    
    setWidth = (width: number) : Visual => {
        this.width(width);
        return this;
    }

    changeSize = (dWidth : number, dHeight : number) : Visual => {
        this.width(this.width()+dWidth)
        this.height(this.height()+dHeight)
        return this;
    }

    getType = () : Visual.Type => {
        return this.type();
    }

    setType = (type: Visual.Type) : void => {
        this.type(type);
    }

    getTarget = () : Node | Edge | Visual | null => {
        return this.target();
    }

    hasTarget = () : boolean => {
        return this.target() != null;
    }

    setTarget = (target: Node | Edge | Visual | null) : Visual => {
        this.target(target);
        return this;
    }

    getTargetLocation = () : {x:number, y:number} => {
        return this.targetLocation();
    }

    setTargetLocation = (location: {x:number, y:number}) : Visual => {
        this.targetLocation(location);
        return this;
    }

    getColor = () : string => {
        return this.color()
    }

    setColor = (color:string) : Visual => {
        this.color(color)
        return this
    }

    isText = () : boolean => {
        return this.type() === Visual.Type.Text;
    }

    isGroup = () : boolean => {
        return this.type() === Visual.Type.Group;
    }

    clone = () : Visual => {
        const result = new Visual(this.type(), this.content())
            .setPosition(this.x(), this.y())
            .setWidth(this.width())
            .setHeight(this.height())
            .setTarget(this.target())
            .setTargetLocation(this.targetLocation())
            .setColor(this.color());
        return result;
    }

    static fromJson(visualData: any, lg: LogicalGraph, errorsWarnings: Errors.ErrorsWarnings) : Visual {
        const id: VisualId = visualData.id as VisualId;
        const x: number = visualData.x;
        const y: number = visualData.y;
        const width: number = visualData.width;
        const height: number = visualData.height;
        const type: Visual.Type = visualData.type;
        const content: string = visualData.content || '';
        const color: string = visualData.color;
        const targetId: string = visualData.targetId || null;
        const targetLocation: {x:number, y:number} = visualData.targetLocation || null;

        const target : Node | Edge | Visual | null = lg.getNodeById(targetId as NodeId) || lg.getEdgeById(targetId as EdgeId) || lg.getVisualById(targetId as VisualId) || null;

        //import errors
        let errorFound: boolean = false;

        if (errorFound){
            return null;
        }

        return new Visual(type, content)
        .setId(id)
        .setPosition(x, y)
        .setWidth(width)
        .setHeight(height)
        .setTarget(target)
        .setColor(color)
        .setTargetLocation(targetLocation);
    }

    static toJson(visual: Visual) : object {
        return {
            id: visual.getId(),
            x: visual.x(),
            y: visual.y(),
            width: visual.width(),
            height: visual.height(),
            type: visual.type(),
            content: visual.content(),
            color: visual.color(),
            targetId: visual.target() ? visual.target().getId() : null,
            targetLocation: visual.targetLocation()
        }
    }
    
    isValid = () : boolean => {

        //if target is set but doesnt exist, invalid
        return false
    }
}

export namespace Visual {
    export enum Type {
        Text = "Text",
        Group = "Group",
    }
}