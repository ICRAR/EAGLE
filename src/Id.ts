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

export class Id {
    static generateNodeId(): NodeId {
        return Id.uuidv4() as NodeId;
    }

    static generateFieldId(): FieldId {
        return Id.uuidv4() as FieldId;
    }

    static generateEdgeId(): EdgeId {
        return Id.uuidv4() as EdgeId;
    }

    static generateGraphConfigId(): GraphConfigId {
        return Id.uuidv4() as GraphConfigId;
    }

    static generateRepositoryId(): RepositoryId {
        return Id.uuidv4() as RepositoryId;
    }

    static generateRepositoryFileId(): RepositoryFileId {
        return Id.uuidv4() as RepositoryFileId;
    }

    static generateVisualId(): VisualId {
        return Id.uuidv4() as VisualId;
    }

    /**
     * Generates a UUID.
     * See https://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript
     * NOTE: the main code path uses the widely-supported crypto.randomUUID()
     *       in the unlikely case this is unavailable, we use the (slightly) less
     *       random version that doesn't require the
     *       crypto.getRandomValues() call that is not available in NodeJS
     */
    private static uuidv4() : string {
        if (typeof crypto.randomUUID !== "undefined"){
            return crypto.randomUUID();
        }

        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
}
