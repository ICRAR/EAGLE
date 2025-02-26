import { Repositories } from "./Repositories";
import { Repository } from "./Repository";


export class EagleStorage {

    public static db: IDBDatabase;

    static init(){
        console.log("EagleStorage.init()");

        const request = indexedDB.open("EAGLE");
        request.onerror = (event) => {
            console.error("Why didn't you allow my web app to use IndexedDB?!");
        };
        request.onsuccess = (event) => {
            EagleStorage.db = (<any>event.target).result;

            EagleStorage.db.onerror = (event) => {
                // generic error handler for all errors targeted at this database's requests!
                console.error(`Database error: ${(<any>event.target).error?.message}`);
              };
        };

        request.onupgradeneeded = (event) => {
            console.log("onupgradeneeded");
            const db = (<any>event.target).result;
  
            // create an objectStore for this database
            const objectStore = db.createObjectStore("repositories", {keyPath: "id"});

            // Use transaction oncomplete to make sure the objectStore creation is
            // finished before adding data into it.
            objectStore.transaction.oncomplete = () => {
                console.log("oncomplete");

                // Store values in the newly created objectStore.
                const customerObjectStore = db.transaction("repositories", "readwrite").objectStore("repositories");

                // read list of repositories from localStorage
                const githubRepos = Repositories.listCustomRepositories(Repository.Service.GitHub);
                const gitlabRepos = Repositories.listCustomRepositories(Repository.Service.GitLab);
                console.log("found ", githubRepos.length + gitlabRepos.length, "repos");

                githubRepos.forEach((repo) => {
                    customerObjectStore.add(Repository.toJson(repo));
                });
                gitlabRepos.forEach((repo) => {
                    customerObjectStore.add(Repository.toJson(repo));
                });
            };
        }
    }
}