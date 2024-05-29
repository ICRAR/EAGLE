import * as ko from "knockout";

import { Eagle } from './Eagle';
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

    ok: ko.Observable<boolean>;

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

        this.ok = ko.observable(false);
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

        this.ok(false);
    }

    fetchImages = () : void => {
        // if already fetched, abort
        if (this.hasFetchedImages()){
            console.warn("Already fetched images");
            return;
        }

        this.isFetchingImages(true);
        this.hasFetchedImages(false);
        this.hasFetchedTags(false);
        this.ok(false);

        // keep reference to browser for use in the callbacks
        const browser: DockerHubBrowser = this;

        // request eagle server to fetch a list of docker hub images
        Utils.httpPostJSON("/getDockerImages", {username:this.username()}, function(error : string, data: any){
            browser.isFetchingImages(false);

            if (error != null){
                console.error(error);
                return;
            }

            browser.hasFetchedImages(true);

            // build list of image strings
            browser.images([]);
            for (const result of data.results){
                browser.images.push(result.namespace + "/" + result.name);
            }

            // abort if no images available for this user
            if (browser.images().length === 0){
                return;
            }

            browser.selectedImage(browser.images()[0]);

            // go ahead and grab the tags for this image
            browser.fetchTags();
        });
    }

    fetchTags = () : void => {
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
        this.ok(false);

        // keep reference to browser for use in the callbacks
        const browser: DockerHubBrowser = this;

        // request eagle server to fetch a list of tags for the given docker image
        Utils.httpPostJSON("/getDockerImageTags", {imagename:this.selectedImage()}, function(error: string, data: any){
            browser.isFetchingTags(false);

            if (error != null){
                console.error(error);
                return;
            }

            browser.hasFetchedTags(true);

            // build list of tag strings
            browser.tags([]);
            browser.digests([]);
            for (const result of data.results){
                browser.tags.push(result.name);
                browser.digests.push(result.images[0].digest);
            }

            // abort if no tags available for this image
            if (browser.tags().length === 0){
                return;
            }

            browser.selectedTag(browser.tags()[0]);
            browser.digest(browser.digests()[0]);
            browser.ok(true);
        });
    }


    //const tag = data.results[userChoiceIndex].name;
    //const digest = data.results[userChoiceIndex].images[0].digest;

    onUsernameChange = () : void => {
        this.hasFetchedImages(false);
        this.fetchImages();
    }

    onImageChange = () : void => {
        this.hasFetchedTags(false);
        this.fetchTags();
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

