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

import { Setting } from "./Setting";
import { Utils } from "./Utils";

export class DockerHubBrowser {
    username: ko.Observable<string>;
    images: ko.ObservableArray<string>;
    tags: ko.ObservableArray<string>;
    digests: ko.ObservableArray<string>;

    selectedImage: ko.Observable<string>;
    selectedTag: ko.Observable<string>;
    digest: ko.Observable<string>;

    hasFetchedImages: ko.Observable<boolean>;
    isFetchingImages: ko.Observable<boolean>;
    hasFetchedTags: ko.Observable<boolean>;
    isFetchingTags: ko.Observable<boolean>;

    isValid: ko.Observable<boolean>; // true iff a valid selection has been made in the docker hub browser UI

    constructor(){
        this.username = ko.observable(Setting.findValue(Setting.DOCKER_HUB_USERNAME));
        this.images = ko.observableArray([]);
        this.tags = ko.observableArray([]);
        this.digests = ko.observableArray([]);
        
        this.selectedImage = ko.observable("");
        this.selectedTag = ko.observable("");
        this.digest = ko.observable("");

        this.isFetchingImages = ko.observable(false);
        this.hasFetchedImages = ko.observable(false);
        this.isFetchingTags = ko.observable(false);
        this.hasFetchedTags = ko.observable(false);

        this.isValid = ko.observable(false);
    }

    clear = () : void => {
        this.username(Setting.findValue(Setting.DOCKER_HUB_USERNAME));
        this.images([]);
        this.tags([]);
        this.digests([]);
        
        this.selectedImage("");
        this.selectedTag("");
        this.digest("");

        this.isFetchingImages(false);
        this.hasFetchedImages(false);
        this.isFetchingTags(false);
        this.hasFetchedTags(false);

        this.isValid(false);
    }

    populate = (username: string, image: string, tag: string) : void => {
        this.username(username);
        this.hasFetchedImages(false);
        this.fetchImages(image, tag);
    }

    fetchImages = async (selectedImage: string | null, selectedTag: string | null): Promise<void> => {
        // if already fetched, abort
        if (this.hasFetchedImages()){
            console.warn("Already fetched images");
            return;
        }

        this.isFetchingImages(true);
        this.hasFetchedImages(false);
        this.hasFetchedTags(false);
        this.isValid(false);

        // request eagle server to fetch a list of docker hub images
        let data: any;
        try {
            data = await Utils.httpPostJSON("/getDockerImages", {username:this.username()});
        } catch (error) {
            console.error(error);
            return;
        } finally {
            this.isFetchingImages(false);
        }
            
        let selectedImageIndex = 0;
        this.hasFetchedImages(true);

        // build list of image strings
        this.images([]);
        for (let i = 0; i < data.results.length ; i++){
            const result = data.results[i];
            const imageName = result.namespace + "/" + result.name;
            this.images.push(imageName);

            if (imageName === selectedImage){
                selectedImageIndex = i;
            }
        }

        // abort if no images available for this user
        if (this.images().length === 0){
            return;
        }

        this.selectedImage(this.images()[selectedImageIndex]);

        // go ahead and grab the tags for this image
        this.fetchTags(selectedTag);
    }

    fetchTags = async (selectedTag: string | null): Promise<void> => {
        // if already fetched, abort
        if (this.hasFetchedTags()){
            console.warn("Already fetched tags");
            return;
        }

        // if not image selected, abort
        if (this.selectedImage() === "" || this.selectedImage() === undefined){
            console.warn("Abort fetch of tags for empty image");
            return;
        }

        this.isFetchingTags(true);
        this.hasFetchedTags(false);
        this.isValid(false);

        // request eagle server to fetch a list of tags for the given docker image
        let data: any;
        try {
            data = await Utils.httpPostJSON("/getDockerImageTags", {imagename:this.selectedImage()});
        } catch (error) {
            console.error(error);
            return;
        } finally {
            this.isFetchingTags(false);
        }

        let selectedTagIndex = 0;
        this.hasFetchedTags(true);

        // build list of tag strings
        this.tags([]);
        this.digests([]);
        for (let i = 0 ; i < data.results.length ; i++){
            const result = data.results[i];
            this.tags.push(result.name);
            this.digests.push(result.images[0].digest);

            if (result.name === selectedTag){
                selectedTagIndex = i;
            }
        }

        // abort if no tags available for this image
        if (this.tags().length === 0){
            return;
        }

        this.selectedTag(this.tags()[selectedTagIndex]);
        this.digest(this.digests()[selectedTagIndex]);
        this.isValid(true);
    }

    onUsernameChange = () : void => {
        this.hasFetchedImages(false);
        this.fetchImages(null, null);
    }

    onImageChange = () : void => {
        this.hasFetchedTags(false);
        this.fetchTags(null);
    }

    onTagChange = () : void => {
        // update digest
        for (let i = 0 ; i < this.tags().length ; i++){
            if (this.tags()[i] === this.selectedTag()){
                this.digest(this.digests()[i]);
            }
        }
    }
}

