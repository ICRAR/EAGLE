import { Repositories } from "./Repositories";
import { Repository } from "./Repository";


export class EagleStorage {

    public static readonly DATABASE_NAME = "EAGLE";
    public static readonly OBJECT_STORE_NAME = "repositories";
    public static readonly TRANSACTION_NAME = "repositories";

    public static db: IDBDatabase;

    static async init(): Promise<void>{
        return new Promise(async(resolve, reject) => {
            console.log("EagleStorage.init()");

            const request = indexedDB.open(EagleStorage.DATABASE_NAME);
            request.onerror = (event) => {
                console.error("Why didn't you allow my web app to use IndexedDB?!");
                reject();
            };
            request.onsuccess = (event) => {
                EagleStorage.db = (<any>event.target).result;

                EagleStorage.db.onerror = (event) => {
                    // generic error handler for all errors targeted at this database's requests!
                    console.error(`Database error: ${(<any>event.target).error?.message}`);
                };

                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = (<any>event.target).result;
    
                // create an objectStore for this database
                const objectStore = db.createObjectStore(EagleStorage.OBJECT_STORE_NAME, {keyPath: "id"});

                // Use transaction oncomplete to make sure the objectStore creation is
                // finished before adding data into it.
                objectStore.transaction.oncomplete = () => {
                    // Store values in the newly created objectStore.
                    const repositoriesObjectStore = db.transaction(EagleStorage.TRANSACTION_NAME, "readwrite").objectStore(EagleStorage.OBJECT_STORE_NAME);

                    // read list of repositories from localStorage
                    const githubRepos = Repositories.listCustomRepositories(Repository.Service.GitHub);
                    const gitlabRepos = Repositories.listCustomRepositories(Repository.Service.GitLab);

                    githubRepos.forEach((repo) => {
                        repositoriesObjectStore.add(Repository.toJson(repo));
                    });
                    gitlabRepos.forEach((repo) => {
                        repositoriesObjectStore.add(Repository.toJson(repo));
                    });
                };
            }
        });
    }

    static async listCustomRepositories(service: Repository.Service): Promise<Repository[]> {
        return new Promise(async(resolve) => {
            const customRepositories: Repository[] = [];

            // query IndexedDB
            const repositoriesObjectStore = EagleStorage.db.transaction(EagleStorage.TRANSACTION_NAME).objectStore(EagleStorage.OBJECT_STORE_NAME);

            repositoriesObjectStore.getAll().onsuccess = (event) => {
                const repos: {id: RepositoryId, service: Repository.Service, name: string, branch: string}[] = (<any>event.target).result;

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