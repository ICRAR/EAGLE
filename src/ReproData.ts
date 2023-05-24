import * as ko from "knockout";

import { Daliuge } from "./Daliuge";
import { Errors } from './Errors';

export class ReproData {
    private _merkleroot : ko.Observable<string>;
    private _signature : ko.Observable<string>;
    private _mode : ko.Observable<Daliuge.ReproducibilityMode>;

    constructor(){
        this._merkleroot = ko.observable("");
        this._signature = ko.observable("");
        this._mode = ko.observable(Daliuge.ReproducibilityMode.Nothing);
    }

    get merkleroot() : string{
        return this._merkleroot();
    }

    set merkleroot(merkleroot : string){
        this._merkleroot(merkleroot);
    }

    get signature() : string{
        return this._signature();
    }

    set signature(signature : string){
        this._signature(signature);
    }

    get mode() : Daliuge.ReproducibilityMode {
        return this._mode();
    }

    set mode(mode : Daliuge.ReproducibilityMode){
        this._mode(mode);
    }

    clear = () : void => {
        this._merkleroot("");
        this._signature("");
        this._mode(Daliuge.ReproducibilityMode.Nothing);
    }

    clone = () : ReproData => {
        const result : ReproData = new ReproData();

        result.merkleroot = this._merkleroot();
        result.signature = this._signature();
        result.mode = this._mode();

        return result;
    }

    toString = () : string => {
        let s = "";

        s += "Merkleroot:" + this._merkleroot();
        s += " Signature:" + this._signature();
        s += " Mode:" + this._mode();

        return s;
    }

    static toJson = (reproData: ReproData) : object => {
        return {
            "rmode": reproData.mode,
            "meta_data": {
                "repro_protocol": 1.0,
                "HashingAlg": "sha3_256"
            },
            "merkleroot": reproData.merkleroot,
            "NOTHING": {
                "signature": reproData.signature
            }
        };
    }

    // TODO: use errors array if attributes cannot be found
    static fromJson = (reproData : any, errorsWarnings: Errors.ErrorsWarnings) : ReproData => {
        const result : ReproData = new ReproData();

        if (typeof reproData.merkleroot !== 'undefined'){
            result.merkleroot = reproData.merkleroot;
        } else {
            errorsWarnings.warnings.push(Errors.Message("Missing merkleroot within reproducibility data"));
        }

        if (typeof reproData.signature !== 'undefined'){
            result.signature = reproData.signature;
        }

        if (typeof reproData.rmode !== 'undefined'){
            result.mode = reproData.rmode;
        }

        return result;
    }
}
