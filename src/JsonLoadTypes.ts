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

import type { FromSchema } from "json-schema-to-ts";
import { lgGraphV4Schema } from "./generated/lgGraphV4Schema";

export type JsonObject = Record<string, unknown>;
export type JsonScalar = string | boolean | number | null;

export const v4GraphLoadSchema = lgGraphV4Schema;

type V4GraphLoadJsonFromSchema = FromSchema<typeof v4GraphLoadSchema>;

export type V4NodeLoadJson = V4GraphLoadJsonFromSchema["nodes"][string];
export type V4FieldLoadJson = V4NodeLoadJson["fields"][string] & {
	changeable?: boolean;
};
export type V4EdgeLoadJson = V4GraphLoadJsonFromSchema["edges"][string] & {
	comment?: string;
};
export type V4VisualLoadJson = V4GraphLoadJsonFromSchema["visuals"][string];
export type V4GraphConfigLoadJson = V4GraphLoadJsonFromSchema["graphConfigurations"][string];
export type V4GraphConfigNodeLoadJson = V4GraphConfigLoadJson["nodes"][string];
export type V4GraphConfigFieldLoadJson = V4GraphConfigNodeLoadJson["fields"][string];
export type V4FileInfoLoadJson = V4GraphLoadJsonFromSchema["modelData"];
export type V4FileLocationLoadJson = V4FileInfoLoadJson["location"];


// NOTE: these new types extend the schema types with optional properties to allow for
// backwards compatibility with older graph files that may not have these properties.
// This is important for loading older graphs without errors.
export type LegacyGraphConfigLoadJson = Partial<V4GraphConfigLoadJson> & {
	name?: string;
	description?: string;
	lastModifiedName?: string;
	lastModifiedEmail?: string;
	lastModifiedDatetime?: number;
	nodes?: Record<string, JsonObject>;
};

export type LegacyGraphConfigNodeLoadJson = Partial<V4GraphConfigNodeLoadJson> & {
	fields?: Record<string, JsonObject>;
};

export type LegacyGraphConfigFieldLoadJson = Partial<V4GraphConfigFieldLoadJson> & {
	value?: JsonScalar;
	comment?: string;
};

export type LegacyV4FileInfoLoadJson = Partial<V4FileInfoLoadJson> & {
	location?: Partial<V4FileLocationLoadJson>;
	graphLocation?: Partial<V4FileLocationLoadJson>;
	eagleVersion?: string;
	eagleCommitHash?: string;
};

export type V4GraphLoadJson = V4GraphLoadJsonFromSchema;
