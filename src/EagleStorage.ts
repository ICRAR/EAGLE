import { Repository, type RepositoryService } from "./Repository";
import { Utils } from "./Utils";

type StoredRepository = {
    id: RepositoryId;
    service: RepositoryService;
    name: string;
    branch: string;
};

export class EagleStorage {

    public static readonly DATABASE_NAME = "EAGLE";
    public static readonly OBJECT_STORE_NAME = "repositories";
    public static readonly TRANSACTION_NAME = "repositories";

    public static db: IDBDatabase;

    static async init(): Promise<void>{
        return new Promise((resolve, reject) => {

            const request = indexedDB.open(EagleStorage.DATABASE_NAME);
            request.onerror = (_event) => {
                reject("IndexedDB not available, or access refused");
            };
            request.onsuccess = () => {
                EagleStorage.db = request.result;

                EagleStorage.db.onerror = (event) => {
                    // generic error handler for all errors targeted at this database's requests!
                    const error = event.target instanceof IDBRequest ? event.target.error : null;
                    reject(`Database error: ${error?.message}`);
                };

                resolve();
            };

            request.onupgradeneeded = (_event) => {
                const db = request.result;
    
                // create an objectStore for this database
                const objectStore = db.createObjectStore(EagleStorage.OBJECT_STORE_NAME, {keyPath: "id"});

                // Use transaction oncomplete to make sure the objectStore creation is
                // finished before adding data into it.
                objectStore.transaction.oncomplete = () => {
                    // Store values in the newly created objectStore.
                    const repositoriesObjectStore = db.transaction(EagleStorage.TRANSACTION_NAME, "readwrite").objectStore(EagleStorage.OBJECT_STORE_NAME);

                    // read list of repositories from localStorage
                    const oldRepositories = Utils.findOldRepositoriesInLocalStorage();
                    console.log("Found", oldRepositories.length, "old repositories in localStorage, converting to IndexedDB");

                    oldRepositories.forEach((repo) => {
                        repositoriesObjectStore.add(Repository.toJson(repo));
                    });
                };
            }
        });
    }

    static async listCustomRepositories(service: RepositoryService): Promise<Repository[]> {
        return new Promise((resolve, reject) => {
            const customRepositories: Repository[] = [];

            if (typeof EagleStorage.db === "undefined"){
                reject("EagleStorage DB is undefined!")
                return;
            }

            // query IndexedDB
            const repositoriesObjectStore = EagleStorage.db.transaction(EagleStorage.TRANSACTION_NAME).objectStore(EagleStorage.OBJECT_STORE_NAME);

            const request = repositoriesObjectStore.getAll() as IDBRequest<StoredRepository[]>;
            
            request.onerror = () => {
                reject(`ObjectStore request error: ${request.error?.message}`);
            };

            request.onsuccess = () => {
                const repos = request.result;

                repos.forEach((repo) => {
                    if (repo.service !== service){
                        return;
                    }

                    const repository = new Repository(repo.service, repo.name, repo.branch, false);
                    repository.setId(repo.id);

                    customRepositories.push(repository);
                });

                console.log(`Fetched ${customRepositories.length} ${service} repositories`);

                resolve(customRepositories);
            };
        });
    }

    static addCustomRepository(repository: Repository): void {
        console.log("Add", repository.name);

        const repositoriesObjectStore = EagleStorage.db.transaction(EagleStorage.TRANSACTION_NAME, "readwrite").objectStore(EagleStorage.OBJECT_STORE_NAME);

        repositoriesObjectStore.add(Repository.toJson(repository));
    }

    static removeCustomRepository(repository: Repository): void {
        console.log("Remove", repository.name, repository._id);

        const repositoriesObjectStore = EagleStorage.db.transaction(EagleStorage.TRANSACTION_NAME, "readwrite").objectStore(EagleStorage.OBJECT_STORE_NAME);

        repositoriesObjectStore.delete(repository._id);
    }
}