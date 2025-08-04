# Project: stackql-provider-utils

## Context
`stackql-provider-utils` is a comprehensive toolkit for transforming OpenAPI specs into [StackQL](https://github.com/stackql/stackql) providers - which are extended OpenAPI specifications for cloud and SaaS providers. The module will include functions for parsing, mapping, validation, testing, and documentation generation utilities.  

These functions include:

- `generateDocs` which will generate docusaurus markdown docs for a provider (more information provided below)
- `analyzeSpec` will analyze an OpenAPI spec and generate a mapping document to be used with `generateProvider`
- `generateProvider` will generate the extensions to the OpenAPI spec to create a stackql provider 
- `testProvider` test the provider against `stackql`

`stackql-provider-utils` will be published to npm js and be used as a module in other JavaScript programs (stackql provider development repos).  

## Methodologies
*   Prioritize modularity and reusability in component design.
*   Implement robust error handling.

## More on `stackql` providers

### Folder structure

the `aws` folder below shows the structure of a locally generated `stackql` provider.

```bash
src/
└── aws # provider root
    └── v00.00.00000 # placeholder version, gets updated when commit to the registry
        ├── provider.yaml # a list of all of the services in the provider, used by the `SHOW SERVICES` command
        └── services # services directory
            └── ce_native.yaml # service spec (open api spec with `x-stackQL...` annotations), there are usually several of these, they could be different endpoints or just the way the provider logically splits up services
```

### `provider.yaml`

here is an abbridged `provider.yaml`, usually there are multiple services, this is also where the `auth` type is declared for the provider and the default env vars used for authentication

```yaml
id: aws
name: aws
version: v00.00.00000
providerServices:
  ce_native:
    id: ce_native:v00.00.00000
    name: ce_native
    preferred: true
    service:
      $ref: aws/v00.00.00000/services/ce_native.yaml
    title: AWS Cost Explorer Service # `title` and `description` come from the `info` for the corresponding service spec
    version: v00.00.00000
    description: 'You Can Use The Cost Explorer API To Programmatically Query Your Cost And Usage Data. You Can Query For Aggregated Data Such As Total Monthly Costs Or Total Daily Usage. You Can Also Query For Granular Data. This Might Include The Number Of Daily Write Operations For Amazon DynamoDB Database Tables In Your Production Environment.  Service Endpoint The Cost Explorer API Provides The Following Endpoint:    Https://Ce.Us-East-1.Amazonaws.Com    For Information About The Costs That Are Associated With The Cost Explorer API, See Amazon Web Services Cost Management Pricing.'
config:
  auth: # this will vary per provider and is usually provided by the provider developer
    type: aws_signing_v4
    credentialsenvvar: AWS_SECRET_ACCESS_KEY
    keyIDenvvar: AWS_ACCESS_KEY_ID
```

Then the actually specs look like this (truncated for brevity):

```yaml
openapi: 3.0.0
servers:
- url: https://{endpoint}.snowflakecomputing.com # this variable (`endpoint`) becomes a required param automatically for all stackql methods, but the info comes from `servers` in the oriignal spec
  description: Multi-tenant Snowflake endpoint
  variables:
    endpoint:
      default: orgid-acctid
      description: Organization and Account Name
info: # comes from the original spec
  version: 0.0.1
  title: Snowflake Database API
  description: The Snowflake Database API is a REST API that you can use to access,
    update, and perform certain actions on Database resource in Snowflake.
  contact:
    name: Snowflake, Inc.
    url: https://snowflake.com
    email: support@snowflake.com
paths: # comes from the original spec as is
  /api/v2/databases:
    get:
      summary: List databases.
      tags:
      - database
      description: Lists the accessible databases.
      operationId: listDatabases
      parameters:
      - $ref: '#/components/parameters/like'
      - $ref: '#/components/parameters/startsWith'
      - $ref: '#/components/parameters/showLimit'
      - $ref: '#/components/parameters/fromName'
      - name: history
        in: query
        description: Optionally includes dropped databases that have not yet been
          purged.
        schema:
          type: boolean
      responses:
        '200':
          description: Successful request.
          headers:
            X-Snowflake-Request-ID:
              $ref: '#/components/headers/X-Snowflake-Request-ID'
            Link:
              $ref: '#/components/headers/Link'
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Database'
        '202':
          $ref: '#/components/responses/202SuccessAcceptedResponse'
        '400':
          $ref: '#/components/responses/400BadRequest'
        '401':
          $ref: '#/components/responses/401Unauthorized'
        '403':
          $ref: '#/components/responses/403Forbidden'
        '404':
          $ref: '#/components/responses/404NotFound'
        '405':
          $ref: '#/components/responses/405MethodNotAllowed'
        '408':
          $ref: '#/components/responses/408RequestTimeout'
        '409':
          $ref: '#/components/responses/409Conflict'
        '410':
          $ref: '#/components/responses/410Gone'
        '429':
          $ref: '#/components/responses/429LimitExceeded'
        '500':
          $ref: '#/components/responses/500InternalServerError'
        '503':
          $ref: '#/components/responses/503ServiceUnavailable'
        '504':
          $ref: '#/components/responses/504GatewayTimeout'
    post:
      summary: Create a database.
      tags:
      - database
      description: Creates a database, with modifiers as query parameters. You must
        provide the full database definition when creating a database.
      operationId: createDatabase
      parameters:
      - $ref: '#/components/parameters/createMode'
      - name: kind
        in: query
        description: Type of database to create. Currently, Snowflake supports only
          `transient` and `permanent` (also represented by the empty string).
        schema:
          type: string
        deprecated: true
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/Database'
      responses:
        '200':
          $ref: '#/components/responses/200SuccessResponse'
        '202':
          $ref: '#/components/responses/202SuccessAcceptedResponse'
        '400':
          $ref: '#/components/responses/400BadRequest'
        '401':
          $ref: '#/components/responses/401Unauthorized'
        '403':
          $ref: '#/components/responses/403Forbidden'
        '404':
          $ref: '#/components/responses/404NotFound'
        '405':
          $ref: '#/components/responses/405MethodNotAllowed'
        '408':
          $ref: '#/components/responses/408RequestTimeout'
        '409':
          $ref: '#/components/responses/409Conflict'
        '410':
          $ref: '#/components/responses/410Gone'
        '429':
          $ref: '#/components/responses/429LimitExceeded'
        '500':
          $ref: '#/components/responses/500InternalServerError'
        '503':
          $ref: '#/components/responses/503ServiceUnavailable'
        '504':
          $ref: '#/components/responses/504GatewayTimeout'
  /api/v2/databases:from-share:
    post:
      summary: Create a database from a share.
      tags:
      - database
      description: Creates a database from a given share.
      operationId: createDatabaseFromShare
      parameters:
      - $ref: '#/components/parameters/createMode'
      - name: share
        in: query
        description: ID of the share from which to create the database, in the form
          "<provider_account>.<share_name>".
        schema:
          type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/DatabaseFromShare'
      responses:
        '200':
          $ref: '#/components/responses/200SuccessResponse'
        '202':
          $ref: '#/components/responses/202SuccessAcceptedResponse'
        '400':
          $ref: '#/components/responses/400BadRequest'
        '401':
          $ref: '#/components/responses/401Unauthorized'
        '403':
          $ref: '#/components/responses/403Forbidden'
        '404':
          $ref: '#/components/responses/404NotFound'
        '405':
          $ref: '#/components/responses/405MethodNotAllowed'
        '408':
          $ref: '#/components/responses/408RequestTimeout'
        '409':
          $ref: '#/components/responses/409Conflict'
        '410':
          $ref: '#/components/responses/410Gone'
        '429':
          $ref: '#/components/responses/429LimitExceeded'
        '500':
          $ref: '#/components/responses/500InternalServerError'
        '503':
          $ref: '#/components/responses/503ServiceUnavailable'
        '504':
          $ref: '#/components/responses/504GatewayTimeout'
  /api/v2/databases/{name}:from_share:
    post:
      summary: Create a database from a share.
      tags:
      - database
      description: Creates a database from a given share.
      operationId: createDatabaseFromShareDeprecated
      parameters:
      - $ref: '#/components/parameters/name'
      - $ref: '#/components/parameters/createMode'
      - name: share
        in: query
        description: ID of the share from which to create the database, in the form
          "<provider_account>.<share_name>".
        schema:
          type: string
      responses:
        '200':
          $ref: '#/components/responses/200SuccessResponse'
        '202':
          $ref: '#/components/responses/202SuccessAcceptedResponse'
        '400':
          $ref: '#/components/responses/400BadRequest'
        '401':
          $ref: '#/components/responses/401Unauthorized'
        '403':
          $ref: '#/components/responses/403Forbidden'
        '404':
          $ref: '#/components/responses/404NotFound'
        '405':
          $ref: '#/components/responses/405MethodNotAllowed'
        '408':
          $ref: '#/components/responses/408RequestTimeout'
        '409':
          $ref: '#/components/responses/409Conflict'
        '410':
          $ref: '#/components/responses/410Gone'
        '429':
          $ref: '#/components/responses/429LimitExceeded'
        '500':
          $ref: '#/components/responses/500InternalServerError'
        '503':
          $ref: '#/components/responses/503ServiceUnavailable'
        '504':
          $ref: '#/components/responses/504GatewayTimeout'
      deprecated: true
  /api/v2/databases/{name}:clone:
    post:
      summary: Clone a database.
      tags:
      - database
      description: Clones an existing database, with modifiers as query parameters.
        You must provide the full database definition when cloning an existing database.
      operationId: cloneDatabase
      parameters:
      - $ref: '#/components/parameters/name'
      - $ref: '#/components/parameters/createMode'
      - name: kind
        in: query
        description: Type of database to create. Currently, Snowflake supports only
          `transient` and `permanent` (also represented by the empty string).
        schema:
          type: string
        deprecated: true
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/DatabaseClone'
      responses:
        '200':
          $ref: '#/components/responses/200SuccessResponse'
        '202':
          $ref: '#/components/responses/202SuccessAcceptedResponse'
        '400':
          $ref: '#/components/responses/400BadRequest'
        '401':
          $ref: '#/components/responses/401Unauthorized'
        '403':
          $ref: '#/components/responses/403Forbidden'
        '404':
          $ref: '#/components/responses/404NotFound'
        '405':
          $ref: '#/components/responses/405MethodNotAllowed'
        '408':
          $ref: '#/components/responses/408RequestTimeout'
        '409':
          $ref: '#/components/responses/409Conflict'
        '410':
          $ref: '#/components/responses/410Gone'
        '429':
          $ref: '#/components/responses/429LimitExceeded'
        '500':
          $ref: '#/components/responses/500InternalServerError'
        '503':
          $ref: '#/components/responses/503ServiceUnavailable'
        '504':
          $ref: '#/components/responses/504GatewayTimeout'
  /api/v2/databases/{name}:
    get:
      tags:
      - database
      description: Fetches a database.
      operationId: fetchDatabase
      parameters:
      - $ref: '#/components/parameters/name'
      responses:
        '200':
          description: successful
          headers:
            X-Snowflake-Request-ID:
              $ref: '#/components/headers/X-Snowflake-Request-ID'
            Link:
              $ref: '#/components/headers/Link'
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Database'
        '202':
          $ref: '#/components/responses/202SuccessAcceptedResponse'
        '400':
          $ref: '#/components/responses/400BadRequest'
        '401':
          $ref: '#/components/responses/401Unauthorized'
        '403':
          $ref: '#/components/responses/403Forbidden'
        '404':
          $ref: '#/components/responses/404NotFound'
        '405':
          $ref: '#/components/responses/405MethodNotAllowed'
        '408':
          $ref: '#/components/responses/408RequestTimeout'
        '409':
          $ref: '#/components/responses/409Conflict'
        '410':
          $ref: '#/components/responses/410Gone'
        '429':
          $ref: '#/components/responses/429LimitExceeded'
        '500':
          $ref: '#/components/responses/500InternalServerError'
        '503':
          $ref: '#/components/responses/503ServiceUnavailable'
        '504':
          $ref: '#/components/responses/504GatewayTimeout'
    put:
      summary: Create a new, or alters an existing, database.
      tags:
      - database
      description: Creates a new, or alters an existing, database. You must provide
        the full database definition even when altering an existing database.
      operationId: createOrAlterDatabase
      parameters:
      - $ref: '#/components/parameters/name'
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/Database'
      responses:
        '200':
          $ref: '#/components/responses/200SuccessResponse'
        '202':
          $ref: '#/components/responses/202SuccessAcceptedResponse'
        '400':
          $ref: '#/components/responses/400BadRequest'
        '401':
          $ref: '#/components/responses/401Unauthorized'
        '403':
          $ref: '#/components/responses/403Forbidden'
        '404':
          $ref: '#/components/responses/404NotFound'
        '405':
          $ref: '#/components/responses/405MethodNotAllowed'
        '408':
          $ref: '#/components/responses/408RequestTimeout'
        '409':
          $ref: '#/components/responses/409Conflict'
        '410':
          $ref: '#/components/responses/410Gone'
        '429':
          $ref: '#/components/responses/429LimitExceeded'
        '500':
          $ref: '#/components/responses/500InternalServerError'
        '503':
          $ref: '#/components/responses/503ServiceUnavailable'
        '504':
          $ref: '#/components/responses/504GatewayTimeout'
    delete:
      summary: Delete a database.
      tags:
      - database
      description: Deletes the specified database. If you enable the `ifExists` parameter,
        the operation succeeds even if the database does not exist. Otherwise, a 404
        failure is returned if the database does not exist. if the drop is unsuccessful.
      operationId: deleteDatabase
      parameters:
      - $ref: '#/components/parameters/name'
      - $ref: '#/components/parameters/ifExists'
      - name: restrict
        in: query
        description: 'Whether to drop the database if foreign keys exist that reference
          any tables in the database.

          - `true`: Return a warning about existing foreign key references and don''t
          drop the database.

          - `false`: Drop the database and all objects in the database, including
          tables with primary or unique keys that are referenced by foreign keys in
          other tables.'
        schema:
          type: boolean
          default: false
      responses:
        '200':
          $ref: '#/components/responses/200SuccessResponse'
        '202':
          $ref: '#/components/responses/202SuccessAcceptedResponse'
        '400':
          $ref: '#/components/responses/400BadRequest'
        '401':
          $ref: '#/components/responses/401Unauthorized'
        '403':
          $ref: '#/components/responses/403Forbidden'
        '404':
          $ref: '#/components/responses/404NotFound'
        '405':
          $ref: '#/components/responses/405MethodNotAllowed'
        '408':
          $ref: '#/components/responses/408RequestTimeout'
        '409':
          $ref: '#/components/responses/409Conflict'
        '410':
          $ref: '#/components/responses/410Gone'
        '429':
          $ref: '#/components/responses/429LimitExceeded'
        '500':
          $ref: '#/components/responses/500InternalServerError'
        '503':
          $ref: '#/components/responses/503ServiceUnavailable'
        '504':
          $ref: '#/components/responses/504GatewayTimeout'
  /api/v2/databases/{name}:undrop:
    post:
      summary: Undrop a database.
      tags:
      - database
      description: Undrops database.
      operationId: undropDatabase
      parameters:
      - $ref: '#/components/parameters/name'
      responses:
        '200':
          $ref: '#/components/responses/200SuccessResponse'
        '202':
          $ref: '#/components/responses/202SuccessAcceptedResponse'
        '400':
          $ref: '#/components/responses/400BadRequest'
        '401':
          $ref: '#/components/responses/401Unauthorized'
        '403':
          $ref: '#/components/responses/403Forbidden'
        '404':
          $ref: '#/components/responses/404NotFound'
        '405':
          $ref: '#/components/responses/405MethodNotAllowed'
        '408':
          $ref: '#/components/responses/408RequestTimeout'
        '409':
          $ref: '#/components/responses/409Conflict'
        '410':
          $ref: '#/components/responses/410Gone'
        '429':
          $ref: '#/components/responses/429LimitExceeded'
        '500':
          $ref: '#/components/responses/500InternalServerError'
        '503':
          $ref: '#/components/responses/503ServiceUnavailable'
        '504':
          $ref: '#/components/responses/504GatewayTimeout'
  /api/v2/databases/{name}/replication:enable:
    post:
      summary: Enable database replication.
      tags:
      - database
      description: Promotes a local database to serve as a primary database for replication.
        A primary database can be replicated in one or more accounts, allowing users
        in those accounts to query objects in each secondary (i.e. replica) database.
      operationId: enableDatabaseReplication
      parameters:
      - $ref: '#/components/parameters/name'
      - name: ignore_edition_check
        in: query
        description: 'Whether to allow replicating data to accounts on lower editions.
          Default: `true`.

          For more information, see the <a href=https://docs.snowflake.com/en/sql-reference/sql/alter-database>
          ALTER DATABASE</a> reference.'
        schema:
          type: boolean
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/AccountIdentifiers'
      responses:
        '200':
          $ref: '#/components/responses/200SuccessResponse'
        '202':
          $ref: '#/components/responses/202SuccessAcceptedResponse'
        '400':
          $ref: '#/components/responses/400BadRequest'
        '401':
          $ref: '#/components/responses/401Unauthorized'
        '403':
          $ref: '#/components/responses/403Forbidden'
        '404':
          $ref: '#/components/responses/404NotFound'
        '405':
          $ref: '#/components/responses/405MethodNotAllowed'
        '408':
          $ref: '#/components/responses/408RequestTimeout'
        '409':
          $ref: '#/components/responses/409Conflict'
        '410':
          $ref: '#/components/responses/410Gone'
        '429':
          $ref: '#/components/responses/429LimitExceeded'
        '500':
          $ref: '#/components/responses/500InternalServerError'
        '503':
          $ref: '#/components/responses/503ServiceUnavailable'
        '504':
          $ref: '#/components/responses/504GatewayTimeout'
  /api/v2/databases/{name}/replication:disable:
    post:
      summary: Disable database replication.
      tags:
      - database
      description: Disables replication for this primary database, meaning no replica
        of this database (i.e. secondary database) in another account can be refreshed.
        Any secondary databases remain linked to the primary database, but requests
        to refresh a secondary database are denied.
      operationId: disableDatabaseReplication
      parameters:
      - $ref: '#/components/parameters/name'
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/AccountIdentifiers'
      responses:
        '200':
          $ref: '#/components/responses/200SuccessResponse'
        '202':
          $ref: '#/components/responses/202SuccessAcceptedResponse'
        '400':
          $ref: '#/components/responses/400BadRequest'
        '401':
          $ref: '#/components/responses/401Unauthorized'
        '403':
          $ref: '#/components/responses/403Forbidden'
        '404':
          $ref: '#/components/responses/404NotFound'
        '405':
          $ref: '#/components/responses/405MethodNotAllowed'
        '408':
          $ref: '#/components/responses/408RequestTimeout'
        '409':
          $ref: '#/components/responses/409Conflict'
        '410':
          $ref: '#/components/responses/410Gone'
        '429':
          $ref: '#/components/responses/429LimitExceeded'
        '500':
          $ref: '#/components/responses/500InternalServerError'
        '503':
          $ref: '#/components/responses/503ServiceUnavailable'
        '504':
          $ref: '#/components/responses/504GatewayTimeout'
  /api/v2/databases/{name}/replication:refresh:
    post:
      summary: Refresh database replications.
      tags:
      - database
      description: 'Refreshes a secondary database from a snapshot of its primary
        database. A snapshot includes changes to the objects and data.

        If you call this endpoint while another refresh for the same replica database
        is running, it fails and returns an error. Snowflake ensures only one refresh
        is executed at any given time.'
      operationId: refreshDatabaseReplication
      parameters:
      - $ref: '#/components/parameters/name'
      responses:
        '200':
          $ref: '#/components/responses/200SuccessResponse'
        '202':
          $ref: '#/components/responses/202SuccessAcceptedResponse'
        '400':
          $ref: '#/components/responses/400BadRequest'
        '401':
          $ref: '#/components/responses/401Unauthorized'
        '403':
          $ref: '#/components/responses/403Forbidden'
        '404':
          $ref: '#/components/responses/404NotFound'
        '405':
          $ref: '#/components/responses/405MethodNotAllowed'
        '408':
          $ref: '#/components/responses/408RequestTimeout'
        '409':
          $ref: '#/components/responses/409Conflict'
        '410':
          $ref: '#/components/responses/410Gone'
        '429':
          $ref: '#/components/responses/429LimitExceeded'
        '500':
          $ref: '#/components/responses/500InternalServerError'
        '503':
          $ref: '#/components/responses/503ServiceUnavailable'
        '504':
          $ref: '#/components/responses/504GatewayTimeout'
  /api/v2/databases/{name}/failover:enable:
    post:
      summary: Enable database failover.
      tags:
      - database
      description: Specifies a comma-separated list of accounts in your organization
        where a replica of this primary database can be promoted to serve as the primary
        database.
      operationId: enableDatabaseFailover
      parameters:
      - $ref: '#/components/parameters/name'
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/AccountIdentifiers'
      responses:
        '200':
          $ref: '#/components/responses/200SuccessResponse'
        '202':
          $ref: '#/components/responses/202SuccessAcceptedResponse'
        '400':
          $ref: '#/components/responses/400BadRequest'
        '401':
          $ref: '#/components/responses/401Unauthorized'
        '403':
          $ref: '#/components/responses/403Forbidden'
        '404':
          $ref: '#/components/responses/404NotFound'
        '405':
          $ref: '#/components/responses/405MethodNotAllowed'
        '408':
          $ref: '#/components/responses/408RequestTimeout'
        '409':
          $ref: '#/components/responses/409Conflict'
        '410':
          $ref: '#/components/responses/410Gone'
        '429':
          $ref: '#/components/responses/429LimitExceeded'
        '500':
          $ref: '#/components/responses/500InternalServerError'
        '503':
          $ref: '#/components/responses/503ServiceUnavailable'
        '504':
          $ref: '#/components/responses/504GatewayTimeout'
  /api/v2/databases/{name}/failover:disable:
    post:
      summary: Disable database failover.
      tags:
      - database
      description: Disables failover for this primary database, meaning no replica
        of this database (i.e. secondary database) can be promoted to serve as the
        primary database.
      operationId: disableDatabaseFailover
      parameters:
      - $ref: '#/components/parameters/name'
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/AccountIdentifiers'
      responses:
        '200':
          $ref: '#/components/responses/200SuccessResponse'
        '202':
          $ref: '#/components/responses/202SuccessAcceptedResponse'
        '400':
          $ref: '#/components/responses/400BadRequest'
        '401':
          $ref: '#/components/responses/401Unauthorized'
        '403':
          $ref: '#/components/responses/403Forbidden'
        '404':
          $ref: '#/components/responses/404NotFound'
        '405':
          $ref: '#/components/responses/405MethodNotAllowed'
        '408':
          $ref: '#/components/responses/408RequestTimeout'
        '409':
          $ref: '#/components/responses/409Conflict'
        '410':
          $ref: '#/components/responses/410Gone'
        '429':
          $ref: '#/components/responses/429LimitExceeded'
        '500':
          $ref: '#/components/responses/500InternalServerError'
        '503':
          $ref: '#/components/responses/503ServiceUnavailable'
        '504':
          $ref: '#/components/responses/504GatewayTimeout'
  /api/v2/databases/{name}/failover:primary:
    post:
      summary: Set a primary database.
      tags:
      - database
      description: Promotes the specified secondary (replica) database to serve as
        the primary database. When promoted, the database becomes writeable. At the
        same time, the previous primary database becomes a read-only secondary database.
      operationId: primaryDatabaseFailover
      parameters:
      - $ref: '#/components/parameters/name'
      responses:
        '200':
          $ref: '#/components/responses/200SuccessResponse'
        '202':
          $ref: '#/components/responses/202SuccessAcceptedResponse'
        '400':
          $ref: '#/components/responses/400BadRequest'
        '401':
          $ref: '#/components/responses/401Unauthorized'
        '403':
          $ref: '#/components/responses/403Forbidden'
        '404':
          $ref: '#/components/responses/404NotFound'
        '405':
          $ref: '#/components/responses/405MethodNotAllowed'
        '408':
          $ref: '#/components/responses/408RequestTimeout'
        '409':
          $ref: '#/components/responses/409Conflict'
        '410':
          $ref: '#/components/responses/410Gone'
        '429':
          $ref: '#/components/responses/429LimitExceeded'
        '500':
          $ref: '#/components/responses/500InternalServerError'
        '503':
          $ref: '#/components/responses/503ServiceUnavailable'
        '504':
          $ref: '#/components/responses/504GatewayTimeout'
components: # from the original spec, except `x-stackQL-resources`
  schemas:
    AccountIdentifiers:
      type: object
      description: Array of unique account identifiers.
      properties:
        accounts:
          type: array
          items:
            type: string
            minLength: 1
      example:
        accounts:
        - accountName1
        - accountName2
      required:
      - accounts
    Database:
      type: object
      description: Snowflake database object.
      properties:
        created_on:
          type: string
          format: date-time
          readOnly: true
          description: Date and time the database was created.
        name:
          $ref: '#/components/schemas/Identifier'
          description: Name of the database.
        kind:
          type: string
          enum:
          - PERMANENT
          - TRANSIENT
          default: PERMANENT
          description: Database type, permanent (default) or transient.
        is_default:
          type: boolean
          readOnly: true
          description: Whether the database is the default database for a user.
        is_current:
          type: boolean
          readOnly: true
          description: Current database for the session.
        origin:
          type: string
          readOnly: true
        owner:
          type: string
          readOnly: true
          description: Name of the role that owns the database.
        comment:
          type: string
          description: Optional comment in which to store information related to the
            database.
        options:
          type: string
          readOnly: true
        retention_time:
          type: integer
          readOnly: true
          description: Number of days that historical data is retained for Time Travel.
        dropped_on:
          type: string
          format: date-time
          readOnly: true
          nullable: true
          description: Date and time the database was dropped.
        budget:
          type: string
          readOnly: true
          description: Budget that defines a monthly spending limit on the compute
            costs for a Snowflake account or a custom group of Snowflake objects.
        owner_role_type:
          type: string
          readOnly: true
          description: Type of role that owns the object, either ROLE or DATABASE_ROLE
        data_retention_time_in_days:
          type: integer
          description: Specifies the number of days for which Time Travel actions
            (CLONE and UNDROP) can be performed on the database, as well as specifying
            the default Time Travel retention time for all schemas created in the
            database.
        default_ddl_collation:
          type: string
          description: Default collation specification for all schemas and tables
            added to the database. You an override the default at the schema and individual
            table levels.
        log_level:
          type: string
          description: Severity level of messages that should be ingested and made
            available in the active event table. Currently, Snowflake supports only
            `TRACE`, `DEBUG`, `INFO`, `WARN`, `ERROR`, `FATAL` and `OFF`.
        max_data_extension_time_in_days:
          type: integer
          description: Maximum number of days for which Snowflake can extend the data
            retention period for tables in the database to prevent streams on the
            tables from becoming stale.
        suspend_task_after_num_failures:
          type: integer
          description: Maximum number of consecutive failed task runs before the current
            task is suspended automatically.
        trace_level:
          type: string
          description: How trace events are ingested into the event table. Currently,
            Snowflake supports only `ALWAYS`, `ON_EVENT`, and `OFF`.
        user_task_managed_initial_warehouse_size:
          type: string
          description: Size of the compute resources to provision for the first run
            of the serverless task, before a task history is available for Snowflake
            to determine an ideal size.
        serverless_task_min_statement_size:
          type: string
          description: Specifies the minimum allowed warehouse size for the serverless
            task. Minimum XSMALL, Maximum XXLARGE.
        serverless_task_max_statement_size:
          type: string
          description: Specifies the maximum allowed warehouse size for the serverless
            task. Minimum XSMALL, Maximum XXLARGE.
        user_task_timeout_ms:
          type: integer
          description: Time limit, in milliseconds, for a single run of the task before
            it times out.
      required:
      - name
    DatabaseClone:
      type: object
      description: Clone database.
      allOf:
      - $ref: '#/components/schemas/Database'
      properties:
        point_of_time:
          $ref: '#/components/schemas/PointOfTime'
    DatabaseFromShare:
      type: object
      description: Database from share.
      properties:
        name:
          $ref: '#/components/schemas/Identifier'
          description: Name of the database.
    Identifier:
      type: string
      description: 'A Snowflake object identifier. If the identifier contains spaces
        or special characters,  the entire string must be enclosed in double quotes.  Identifiers
        enclosed in double quotes are also case-sensitive.

        '
      pattern: ^"([^"]|"")+"|[a-zA-Z_][a-zA-Z0-9_$]*$
      example: TEST_NAME
    ErrorResponse:
      type: object
      properties:
        message:
          type: string
          description: Error message returned by the server
        code:
          type: string
          description: Error code.
        error_code:
          type: string
          description: Error code, same as `code` above. This property has been deprecated
            and will be removed in a future release, but is temporarily supported
            for for short-term backward compatibility.
        request_id:
          type: string
          description: Unique request ID.
      example:
        message: Compilation error!
        error_code: '390189'
        request_id: 01afef9d-0607-0550-0001-dd270c3902d7
    SuccessResponse:
      type: object
      description: Schema for all the success responses returned by the server.
      properties:
        status:
          type: string
          description: Message returned by the server.
      example:
        status: Request successfully completed
    SuccessAcceptedResponse:
      type: object
      description: Schema for a request in progress response returned by the server.
      properties:
        code:
          type: string
          description: Message code returned by the server.
        message:
          type: string
          description: Message returned by the server
        resultHandler:
          type: string
          description: Opaque result ID used for checking for request completion through
            one or more subsequent completion check operations.
      example:
        code: '392604'
        message: Request execution in progress. Use the provided location header or
          result handler ID to perform query monitoring and management.
    PointOfTime:
      type: object
      description: Point of time.
      required:
      - point_of_time_type
      properties:
        point_of_time_type:
          description: 'Type of the point of time. Possible values include:

            - `timestamp`: Exact time using the standard timezone format. Example:
            `2023-09-15 10:59:43`. - `offset`: Interval relative to ''now.'' Example:
            `1 day`. - `statement`: ID of a query statement to use as the reference
            point for <a href=https://docs.snowflake.com/en/sql-reference/sql/create-clone#time-travel-parameters>Time
            Travel</a>.

            For more information, see https://docs.snowflake.com/en/sql-reference/data-types-datetime.'
          type: string
          examples:
            timestamp:
              value: '2023-09-15 10:59:43'
            offset:
              value: 20 ms
        reference:
          type: string
          description: Relation to the point of time. Currently, the API supports
            `at` and `before`.
      discriminator:
        propertyName: point_of_time_type
        mapping:
          timestamp: PointOfTimeTimestamp
          offset: PointOfTimeOffset
          statement: PointOfTimeStatement
    PointOfTimeTimestamp:
      description: Point of time identified by a timestamp.
      allOf:
      - $ref: '#/components/schemas/PointOfTime'
      properties:
        timestamp:
          type: string
          description: Timestamp of the point of time.
    PointOfTimeOffset:
      description: Point of time identified by an offset in reference to the current
        time, such as `10 min`.
      allOf:
      - $ref: '#/components/schemas/PointOfTime'
      examples:
        month:
          value: 2 months
        milliseconds:
          value: 20 ms
      properties:
        offset:
          type: string
          description: 'Offset from the point of time. Example: `1 year`'
    PointOfTimeStatement:
      description: Point of time indicating when a statement was executed.
      allOf:
      - $ref: '#/components/schemas/PointOfTime'
      properties:
        statement:
          type: string
          description: Statement of the point of time.
    Parameter:
      description: Snowflake parameter defined at the system, account, user, session,
        or object level.
      type: object
      required:
      - name
      properties:
        name:
          type: string
          description: Parameter name.
        value:
          type: string
          description: Parameter value.
        defaultValue:
          type: string
          description: Default parameter value.
        dataType:
          type: string
          description: Data type of the parameter value. Either BOOLEAN, NUMBER, FLOAT,
            or STRING.
        level:
          type: string
          description: Level at which parameter is defined.
        description:
          type: string
          description: Parameter description.
      example:
        name: SAMPLE_SNOWAPI_PARAM
        value: true
        defaultValue: false
        dataType: boolean
        level: ACCOUNT
        description: Sample snowflake parameter.
    TargetLag:
      type: object
      description: Specifies the schedule for periodically refreshing the dynamic
        table.
      properties:
        type:
          description: Type of lag, can be either USER_DEFINED or DOWNSTREAM.
          type: string
      discriminator:
        propertyName: type
        mapping:
          USER_DEFINED: UserDefinedLag
          DOWNSTREAM: DownstreamLag
    UserDefinedLag:
      description: User-defined target lag.
      allOf:
      - $ref: '#/components/schemas/TargetLag'
      properties:
        seconds:
          type: integer
          format: int64
          description: Target lag time in seconds.
      example:
        seconds: 3600
      required:
      - seconds
    DownstreamLag:
      description: Downstream target lag
      allOf:
      - $ref: '#/components/schemas/TargetLag'
  securitySchemes:
    KeyPair:
      type: http
      scheme: bearer
      bearerFormat: JWT
      description: Set `X-Snowflake-Authorization-Token-Type` to `KEYPAIR_JWT` if
        the token is a key-pair authentication JWT.
    ExternalOAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
      description: Configure External Oauth with Snowflake (see <a href=https://docs.snowflake.com/en/user-guide/oauth-ext-overview>External
        OAuth overview</a>.) Set `X-Snowflake-Authorization-Token-Type` to `OAUTH`
        and set the Token to the auth token received from the external Auth server.
    SnowflakeOAuth:
      type: oauth2
      flows:
        implicit:
          authorizationUrl: /oauth/authorize
          scopes: {}
      description: Set `X-Snowflake-Authorization-Token-Type` to `OAUTH` if the token
        is snowflakeOAuth
  parameters:
    database_name:
      name: database_name
      description: Identifier (i.e. name) for the database to which the resource belongs.
        You can use the `/api/v2/databases` GET request to get a list of available
        databases.
      required: true
      in: path
      schema:
        example: TEST_DB
        $ref: '#/components/schemas/Identifier'
    schema_name:
      name: schema_name
      description: Identifier (i.e. name) for the schema to which the resource belongs.
        You can use the `/api/v2/databases/{database}/schemas` GET request to get
        a list of available schemas for the specified database.
      required: true
      in: path
      schema:
        example: TEST_SCHEMA
        $ref: '#/components/schemas/Identifier'
    application:
      name: application
      description: Identifier (i.e. name) for the application to which the resource
        belongs. You can use the `/api/v2/applications/{application}` GET request
        to get a list of available applications.
      required: true
      in: path
      schema:
        example: TEST_APPLICATION
        $ref: '#/components/schemas/Identifier'
    name:
      name: name
      description: Identifier (i.e. name) for the resource.
      required: true
      in: path
      schema:
        example: TEST_NAME
        $ref: '#/components/schemas/Identifier'
    nameWithArgs:
      name: nameWithArgs
      description: Function's name with Args
      required: true
      in: path
      schema:
        type: string
        example: foo(a number, b number)
    createMode:
      name: createMode
      description: 'Query parameter allowing support for different modes of resource
        creation. Possible values include:

        - `errorIfExists`: Throws an error if you try to create a resource that already
        exists.

        - `orReplace`: Automatically replaces the existing resource with the current
        one.

        - `ifNotExists`: Creates a new resource when an alter is requested for a non-existent
        resource.'
      in: query
      schema:
        type: string
        enum:
        - errorIfExists
        - orReplace
        - ifNotExists
        example: ifNotExists
        default: errorIfExists
    mode:
      name: mode
      description: 'Query parameter determines whether the revoke operation succeeds
        or fails for the privileges, based on the whether the privileges had been
        re-granted to another role.

        - restrict: If the privilege being revoked has been re-granted to another
        role, the REVOKE command fails.

        - cascade: If the privilege being revoked has been re-granted, the REVOKE
        command recursively revokes these dependent grants. If the same privilege
        on an object has been granted to the target role by a different grantor (parallel
        grant), that grant is not affected and the target role retains the privilege.'
      in: query
      schema:
        type: string
        enum:
        - restrict
        - cascade
        example: restrict
    ifExists:
      name: ifExists
      description: 'Query parameter that specifies how to handle the request for a
        resource that does not exist:

        - `true`: The endpoint does not throw an error if the resource does not exist.
        It returns a 200 success response, but does not take any action on the resource.

        - `false`: The endpoint throws an error if the resource doesn''t exist.'
      in: query
      schema:
        type: boolean
        example: true
        default: false
    like:
      name: like
      description: Query parameter to filter the command output by resource name.
        Uses case-insensitive pattern matching, with support for SQL wildcard characters.
      in: query
      schema:
        type: string
        example: test_%
    pattern:
      name: pattern
      description: A query parameter that filters the command output by a regular
        expression pattern.
      in: query
      schema:
        type: string
        example: .*data_0.*
    startsWith:
      name: startsWith
      description: Query parameter to filter the command output based on the string
        of characters that appear at the beginning of the object name. Uses case-sensitive
        pattern matching.
      in: query
      schema:
        type: string
        example: test
    rootOnly:
      name: rootOnly
      description: Query parameter to filter the command output to return only root
        resources (resources with no predecessors).
      in: query
      schema:
        type: boolean
        example: false
        default: false
    showLimit:
      name: showLimit
      description: Query parameter to limit the maximum number of rows returned by
        a command.
      in: query
      schema:
        type: integer
        example: 10
        minimum: 1
        maximum: 10000
    fromName:
      name: fromName
      description: Query parameter to enable fetching rows only following the first
        row whose object name matches the specified string. Case-sensitive and does
        not have to be the full name.
      in: query
      schema:
        type: string
        example: from_test
    copyGrants:
      name: copyGrants
      description: Query parameter to enable copy grants when creating the object.
      in: query
      schema:
        type: boolean
        example: false
        default: false
    asyncExec:
      name: asyncExec
      in: query
      description: Asynchronous execution enable/disable. Default is disable.
      schema:
        type: boolean
        default: false
    sessionId:
      name: sessionId
      description: Unique ID for the current session.
      required: true
      in: path
      schema:
        type: integer
        format: uuid
        example: 524514326772799
    content-type:
      name: Content-Type
      description: Type of content for the resource. Currently supports `application/json`.
      in: header
      schema:
        type: string
        enum:
        - application/json
    accept:
      name: Accept
      description: Type of data format accepted by the resource. Currently supports
        `application/json`.
      in: header
      schema:
        type: string
        enum:
        - application/json
    x-snowflake-authorization-token-type:
      name: X-Snowflake-Authorization-Token-Type
      description: Type of the Snowflake authorization token. Currently, keypair-jwt
        (`KEYPAIR_JWT`) and OAuth tokens are supported.
      in: header
      schema:
        type: string
        enum:
        - KEYPAIR_JWT
        - OAUTH
    x-sfc-session:
      name: X-Sfc-Session
      description: Token for the current Snowflake session.
      in: header
      required: false
      schema:
        type: string
        description: Snowflake session token.
        example: ver:3-hint:1000-ABCD=
  headers:
    X-Snowflake-Request-ID:
      description: Unique ID of the API request.
      schema:
        type: string
        format: uuid
    Link:
      description: Links to the page of results (e.g. the first page, the last page,
        etc.). The header can include multiple 'url' entries with different 'rel'
        attribute values that specify the page to return ('first', 'next', 'prev',
        and 'last').
      schema:
        type: string
        example: </api/v2/results/01b66701-0000-001c-0000-0030000b91521?page=0>; rel="first",</api/v2/results/01b66701-0000-001c-0000-0030000b91521?page=1>;
          rel="next",</api/v2/results/01b66701-0000-001c-0000-0030000b91521?page=9>;
          rel="last"
  responses:
    200SuccessResponse:
      description: Successful request.
      headers:
        X-Snowflake-Request-ID:
          $ref: '#/components/headers/X-Snowflake-Request-ID'
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/SuccessResponse'
    201SuccessCreatedResponse:
      description: Successfully created a new resource on the server.
      headers:
        X-Snowflake-Request-ID:
          $ref: '#/components/headers/X-Snowflake-Request-ID'
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/SuccessResponse'
    202SuccessAcceptedResponse:
      headers:
        Location:
          schema:
            type: string
            description: Relative path for checking request status or getting the
              result, if available.
        X-Snowflake-Request-ID:
          $ref: '#/components/headers/X-Snowflake-Request-ID'
      description: Successfully accepted the request, but it is not completed yet.
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/SuccessAcceptedResponse'
    400BadRequest:
      description: Bad Request. The request payload is invalid or malformed. This
        happens if the application didn't send the correct request payload. The response
        body may include the error code and message indicating the actual cause. The
        application must reconstruct the request body for retry.
      headers:
        X-Snowflake-Request-ID:
          $ref: '#/components/headers/X-Snowflake-Request-ID'
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorResponse'
    401Unauthorized:
      description: Unauthorized. The request is not authorized. This happens if the
        attached access token is invalid or missing. The response body may include
        the error code and message indicating the actual cause, e.g., expired, invalid
        token. The application must obtain a new access token for retry.
      headers:
        X-Snowflake-Request-ID:
          $ref: '#/components/headers/X-Snowflake-Request-ID'
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorResponse'
    403Forbidden:
      description: Forbidden. The request is forbidden. This can also happen if the
        request is made even if the API is not enabled.
      headers:
        X-Snowflake-Request-ID:
          $ref: '#/components/headers/X-Snowflake-Request-ID'
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorResponse'
    404NotFound:
      description: Not Found. The request endpoint is not valid. This happens if the
        API endpoint does not exist, or if the API is not enabled.
      headers:
        X-Snowflake-Request-ID:
          $ref: '#/components/headers/X-Snowflake-Request-ID'
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorResponse'
    405MethodNotAllowed:
      description: Method Not Allowed. The request method doesn't match the supported
        API. This happens, for example, if the application calls the API with GET
        method but the endpoint accepts only POST.
      headers:
        X-Snowflake-Request-ID:
          $ref: '#/components/headers/X-Snowflake-Request-ID'
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorResponse'
    408RequestTimeout:
      description: Request Timeout. This indicates that the request from the client
        timed out and was not completed by the server.
      headers:
        X-Snowflake-Request-ID:
          $ref: '#/components/headers/X-Snowflake-Request-ID'
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorResponse'
    409Conflict:
      description: Conflict. The requested operation could not be performed due to
        a conflicting state that could not be resolved. This usually happens when
        a CREATE request was performed when there is a pre-existing resource with
        the same name, and also without one of the options orReplace/ifNotExists.
      headers:
        X-Snowflake-Request-ID:
          $ref: '#/components/headers/X-Snowflake-Request-ID'
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorResponse'
    410Gone:
      description: Gone. This error is primarily intended to assist the task of web
        maintenance by notifying the recipient that the resource is intentionally
        unavailable.
      headers:
        X-Snowflake-Request-ID:
          $ref: '#/components/headers/X-Snowflake-Request-ID'
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorResponse'
    415UnsupportedMediaType:
      description: The request header Content-Type includes an unsupported media type.
        The API supports application/json only. If none specified, the request payload
        is taken as JSON, but if any other media type is specified, this error is
        returned.
      headers:
        X-Snowflake-Request-ID:
          $ref: '#/components/headers/X-Snowflake-Request-ID'
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorResponse'
    429LimitExceeded:
      description: Limit Exceeded. The number of requests hit the rate limit. The
        application must slow down the frequency of hitting the API endpoints.
      headers:
        X-Snowflake-Request-ID:
          $ref: '#/components/headers/X-Snowflake-Request-ID'
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorResponse'
    500InternalServerError:
      description: Internal Server Error. The server hit an unrecoverable system error.
        The response body may include the error code and message for further guidance.
        The application owner may need to reach out the customer support.
      headers:
        X-Snowflake-Request-ID:
          $ref: '#/components/headers/X-Snowflake-Request-ID'
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorResponse'
    503ServiceUnavailable:
      description: Service Unavailable. The request was not processed due to server
        side timeouts. The application may retry with backoff. The jittered backoff
        is recommended.
      headers:
        X-Snowflake-Request-ID:
          $ref: '#/components/headers/X-Snowflake-Request-ID'
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorResponse'
    504GatewayTimeout:
      description: Gateway Timeout. The request was not processed due to server side
        timeouts. The application may retry with backoff. The jittered backoff is
        recommended.
      headers:
        X-Snowflake-Request-ID:
          $ref: '#/components/headers/X-Snowflake-Request-ID'
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorResponse'
  x-stackQL-resources: # this is the `stackql` magic
    databases: # this is a `stackql` resource
      methods:
        list_databases: # these are `stackql` methods, typically the name is a snake case (SQL friendly) version of the `operationId`
          operation:
            $ref: '#/paths/~1api~1v2~1databases/get' # this is a pointer to the operation in the spec
          response:
            mediaType: application/json # this is the `mediaType` for the successul return from the operation
            openAPIDocKey: '200' # this is the successful response code (which has the data)
        create_database:
          operation:
            $ref: '#/paths/~1api~1v2~1databases/post'
          response:
            mediaType: ''
            openAPIDocKey: '200'
        create_database_from_share:
          operation:
            $ref: '#/paths/~1api~1v2~1databases:from-share/post'
          response:
            mediaType: ''
            openAPIDocKey: '200'
        create_database_from_share_deprecated:
          operation:
            $ref: '#/paths/~1api~1v2~1databases~1{name}:from_share/post'
          response:
            mediaType: ''
            openAPIDocKey: '200'
        clone_database:
          operation:
            $ref: '#/paths/~1api~1v2~1databases~1{name}:clone/post'
          response:
            mediaType: ''
            openAPIDocKey: '200'
        fetch_database:
          operation:
            $ref: '#/paths/~1api~1v2~1databases~1{name}/get'
          response:
            mediaType: application/json
            openAPIDocKey: '200'
            objectKey: $.instances # you may sometimes see this, this means that the `array` of things that you care about for a `SELECT` response are in this field in the response, this is a fictious key but shown for reference, as you will see these in other specs
        create_or_alter_database:
          operation:
            $ref: '#/paths/~1api~1v2~1databases~1{name}/put'
          response:
            mediaType: ''
            openAPIDocKey: '200'
        delete_database:
          operation:
            $ref: '#/paths/~1api~1v2~1databases~1{name}/delete'
          response:
            mediaType: ''
            openAPIDocKey: '200'
        undrop_database:
          operation:
            $ref: '#/paths/~1api~1v2~1databases~1{name}:undrop/post'
          response:
            mediaType: ''
            openAPIDocKey: '200'
        enable_database_replication:
          operation:
            $ref: '#/paths/~1api~1v2~1databases~1{name}~1replication:enable/post'
          response:
            mediaType: ''
            openAPIDocKey: '200'
        disable_database_replication:
          operation:
            $ref: '#/paths/~1api~1v2~1databases~1{name}~1replication:disable/post'
          response:
            mediaType: ''
            openAPIDocKey: '200'
        refresh_database_replication:
          operation:
            $ref: '#/paths/~1api~1v2~1databases~1{name}~1replication:refresh/post'
          response:
            mediaType: ''
            openAPIDocKey: '200'
        enable_database_failover:
          operation:
            $ref: '#/paths/~1api~1v2~1databases~1{name}~1failover:enable/post'
          response:
            mediaType: ''
            openAPIDocKey: '200'
        disable_database_failover:
          operation:
            $ref: '#/paths/~1api~1v2~1databases~1{name}~1failover:disable/post'
          response:
            mediaType: ''
            openAPIDocKey: '200'
        primary_database_failover:
          operation:
            $ref: '#/paths/~1api~1v2~1databases~1{name}~1failover:primary/post'
          response:
            mediaType: ''
            openAPIDocKey: '200'
      sqlVerbs: # here is where we map sql verbs to methods (which get mapped to operations)
        select: # notice that sql verbs can be overloaded (differentiated by signatures - required params which become WHERE clause components)
        - $ref: '#/components/x-stackQL-resources/databases/methods/list_databases'
        - $ref: '#/components/x-stackQL-resources/databases/methods/fetch_database'
        insert:
        - $ref: '#/components/x-stackQL-resources/databases/methods/create_database'
        update: []
        delete:
        - $ref: '#/components/x-stackQL-resources/databases/methods/delete_database'
        replace:
        - $ref: '#/components/x-stackQL-resources/databases/methods/create_or_alter_database'
      id: snowflake.database.databases
      name: databases
      title: Databases
security: # comes from the spec
- KeyPair: []
- ExternalOAuth: []
- SnowflakeOAuth: []
```

There is a sample provider in `tests/docgen/src/snowflake...`

## `generateDocs` info

Provider docs are markdown docs which detail the provider, the services and resources.  

Here is an excerpt of the docs foilder structure:

```bash
tests/docgen/test-output/
└── snowflake-docs
    ├── index.md # this is the provider index doc
    ├── providers
    │   └── snowflake
    │       ├── account # this is a service dir
    │       │   ├── accounts # this is a resource dir - there could be multiple resources per service
    │       │   │   └── index.md # this is the resource doc
    │       │   └── index.md # this is the service doc
    │       ├── alert
    │       │   ├── alerts
    │       │   │   └── index.md
    │       │   └── index.md
    │       ├── api_integration
    │       │   ├── api_integrations
    │       │   │   └── index.md
    │       │   └── index.md
    │       ├── catalog_integration
    │       │   ├── catalog_integrations
    │       │   │   └── index.md
    │       │   └── index.md
    └── stackql-provider-registry.mdx # this is used as mutliple microsites are combined
```

Here is a sample provider index doc:

```md
---
title: snowflake
hide_title: false
hide_table_of_contents: false
keywords:
  - snowflake
  - stackql
  - infrastructure-as-code
  - configuration-as-data
  - cloud inventory
description: Query, deploy and manage Snowflake resources using SQL
custom_edit_url: null
image: /img/providers/snowflake/stackql-snowflake-provider-featured-image.png
id: snowflake-doc
slug: /providers/snowflake

---

import CopyableCode from '@site/src/components/CopyableCode/CopyableCode';

Snowflake for managing data warehousing, analytics, and secure data sharing with scalable cloud-native architecture and pay-as-you-go pricing.


:::info Provider Summary

<div class="row">
<div class="providerDocColumn">
<span>total services:&nbsp;<b>32</b></span><br />
<span>total resources:&nbsp;<b>79</b></span><br />
</div>
</div>

:::

See also:   
[[` SHOW `]](https://stackql.io/docs/language-spec/show) [[` DESCRIBE `]](https://stackql.io/docs/language-spec/describe)  [[` REGISTRY `]](https://stackql.io/docs/language-spec/registry)
* * * 

## Installation

To pull the latest version of the `snowflake` provider, run the following command:  

```bash
REGISTRY PULL snowflake;
```
> To view previous provider versions or to pull a specific provider version, see [here](https://stackql.io/docs/language-spec/registry).  

## Authentication

The following system environment variables are used for authentication by default:  

- <CopyableCode code="SNOWFLAKE_PAT" /> - Snowflake Programmatic Access Token (PAT) (see <a href="https://docs.snowflake.com/developer-guide/snowflake-rest-api/authentication#using-a-programmatic-access-token-pat">Using a programmatic access token (PAT)</a>)

These variables are sourced at runtime (from the local machine or as CI variables/secrets).  

<details>

<summary>Using different environment variables</summary>

To use different environment variables (instead of the defaults), use the `--auth` flag of the `stackql` program.  For example:  

```bash

AUTH='{ "snowflake": { "type": "bearer",  "credentialsenvvar": "YOUR_SNOWFLAKE_PAT_VAR" }}'
stackql shell --auth="${AUTH}"

```
or using PowerShell:  

```powershell

$Auth = "{ 'snowflake': { 'type': 'bearer',  'credentialsenvvar': 'YOUR_SNOWFLAKE_PAT_VAR' }}"
stackql.exe shell --auth=$Auth

```
</details>


## Services
<div class="row">
<div class="providerDocColumn">
<a href="/providers/snowflake/account/">account</a><br />
<a href="/providers/snowflake/alert/">alert</a><br />
<a href="/providers/snowflake/api_integration/">api_integration</a><br />
<a href="/providers/snowflake/catalog_integration/">catalog_integration</a><br />
<a href="/providers/snowflake/compute_pool/">compute_pool</a><br />
<a href="/providers/snowflake/database/">database</a><br />
<a href="/providers/snowflake/database_role/">database_role</a><br />
<a href="/providers/snowflake/dynamic_table/">dynamic_table</a><br />
<a href="/providers/snowflake/event_table/">event_table</a><br />
<a href="/providers/snowflake/external_volume/">external_volume</a><br />
<a href="/providers/snowflake/function/">function</a><br />
<a href="/providers/snowflake/grant/">grant</a><br />
<a href="/providers/snowflake/iceberg_table/">iceberg_table</a><br />
<a href="/providers/snowflake/image_repository/">image_repository</a><br />
<a href="/providers/snowflake/managed_account/">managed_account</a><br />
<a href="/providers/snowflake/network_policy/">network_policy</a><br />
</div>
<div class="providerDocColumn">
<a href="/providers/snowflake/notebook/">notebook</a><br />
<a href="/providers/snowflake/notification_integration/">notification_integration</a><br />
<a href="/providers/snowflake/pipe/">pipe</a><br />
<a href="/providers/snowflake/procedure/">procedure</a><br />
<a href="/providers/snowflake/result/">result</a><br />
<a href="/providers/snowflake/role/">role</a><br />
<a href="/providers/snowflake/schema/">schema</a><br />
<a href="/providers/snowflake/sqlapi/">sqlapi</a><br />
<a href="/providers/snowflake/stage/">stage</a><br />
<a href="/providers/snowflake/streams/">streams</a><br />
<a href="/providers/snowflake/table/">table</a><br />
<a href="/providers/snowflake/task/">task</a><br />
<a href="/providers/snowflake/user/">user</a><br />
<a href="/providers/snowflake/user_defined_function/">user_defined_function</a><br />
<a href="/providers/snowflake/view/">view</a><br />
<a href="/providers/snowflake/warehouse/">warehouse</a><br />
</div>
</div>
```

summary of the provider, with some metrics, and auth info and then a listing of relative links to service specs, split across two columns.  The header information is provided by the developer in the `provider-data` folder you can see in `tests/docgen` as `headerContent1.txt` and `headerContent2.txt`.  

a service index doc looks like this:

```md
---
title: account
hide_title: false
hide_table_of_contents: false
keywords:
  - account
  - snowflake
  - stackql
  - infrastructure-as-code
  - configuration-as-data
  - cloud inventory
description: Query, deploy and manage snowflake resources using SQL
custom_edit_url: null
image: /img/providers/snowflake/stackql-snowflake-provider-featured-image.png
---

account service documentation.

:::info Service Summary

<div class="row">
<div class="providerDocColumn">
<span>total resources:&nbsp;<b>1</b></span><br />
</div>
</div>

:::

## Resources
<div class="row">
<div class="providerDocColumn">
<a href="/providers/snowflake/account/accounts/">accounts</a>
</div>
<div class="providerDocColumn">

</div>
</div>
```

resource links are split evenly into two columns in case there are more than one.   

here is a resource doc, this is where most of the action happens, notice the sections:

```md
---
title: accounts
hide_title: false
hide_table_of_contents: false
keywords:
  - accounts
  - account
  - snowflake
  - infrastructure-as-code
  - configuration-as-data
  - cloud inventory
description: Query, deploy and manage snowflake resources using SQL
custom_edit_url: null
image: /img/providers/snowflake/stackql-snowflake-provider-featured-image.png
---

import CopyableCode from '@site/src/components/CopyableCode/CopyableCode';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

Creates, updates, deletes, gets or lists a <code>accounts</code> resource.

## Overview
<table><tbody>
<tr><td><b>Name</b></td><td><code>accounts</code></td></tr>
<tr><td><b>Type</b></td><td>Resource</td></tr>
<tr><td><b>Id</b></td><td><CopyableCode code="snowflake.account.accounts" /></td></tr>
</tbody></table>

## Fields
| Name | Datatype | Description |
|:-----|:---------|:------------|
| <CopyableCode code="name" /> | `string` | A Snowflake object identifier. If the identifier contains spaces or special characters, the entire string must be enclosed in double quotes. Identifiers enclosed in double quotes are also case-sensitive. |
| <CopyableCode code="account_locator" /> | `string` | System-assigned identifier of the acccount. |
| <CopyableCode code="account_locator_url" /> | `string` | Legacy Snowflake account URL syntax that includes the region_name and account_locator. |
| <CopyableCode code="account_old_url_last_used" /> | `string` | If the original account URL was saved when the account was renamed, indicates the last time the account was accessed using the original URL. |
| <CopyableCode code="account_old_url_saved_on" /> | `string` | If the original account URL was saved when the account was renamed, provides the date and time when the original account URL was saved. |
| <CopyableCode code="account_url" /> | `string` | Preferred Snowflake account URL that includes the values of organization_name and account_name. |
| <CopyableCode code="admin_name" /> | `string` | Name of the account administrator. |
| <CopyableCode code="admin_password" /> | `string` | Password for the account administrator. |
| <CopyableCode code="admin_rsa_public_key" /> | `string` | RSA public key for the account administrator. |
| <CopyableCode code="admin_user_type" /> | `string` | User type of the account administrator. |
| <CopyableCode code="comment" /> | `string` | Optional comment in which to store information related to the account. |
| <CopyableCode code="consumption_billing_entity_name" /> | `string` | Name of the consumption billing entity. |
| <CopyableCode code="created_on" /> | `string` | Date and time the account was created. |
| <CopyableCode code="dropped_on" /> | `string` | Date and time the account was dropped. |
| <CopyableCode code="edition" /> | `string` | Snowflake Edition of the account. |
| <CopyableCode code="email" /> | `string` | Email address of the account administrator. |
| <CopyableCode code="first_name" /> | `string` | First name of the account administrator. |
| <CopyableCode code="is_events_account" /> | `boolean` | Indicates whether an account is an events account. For more information, see Set up logging and event sharing for an application. |
| <CopyableCode code="is_org_admin" /> | `boolean` | Indicates whether the ORGADMIN role is enabled in an account. If TRUE, the role is enabled. |
| <CopyableCode code="last_name" /> | `string` | Last name of the account administrator. |
| <CopyableCode code="managed_accounts" /> | `integer` | Indicates how many managed accounts have been created by the account. |
| <CopyableCode code="marketplace_consumer_billing_entity_name" /> | `string` | Name of the marketplace consumer billing entity. |
| <CopyableCode code="marketplace_provider_billing_entity_name" /> | `string` | Name of the marketplace provider billing entity. |
| <CopyableCode code="moved_on" /> | `string` | Date and time when the account was moved to a different organization. |
| <CopyableCode code="moved_to_organization" /> | `string` | If the account was moved to a different organization, provides the name of that organization. |
| <CopyableCode code="must_change_password" /> | `boolean` | Indicates whether the account administrator must change the password at the next login. |
| <CopyableCode code="old_account_url" /> | `string` | If the original account URL was saved when the account was renamed, provides the original URL. If the original account URL was dropped, the value is NULL even if the account was renamed |
| <CopyableCode code="organization_URL_expiration_on" /> | `string` | If the account’s organization was changed in a way that created a new account URL and the original account URL was saved, provides the date and time when the original account URL will be dropped. Dropped URLs cannot be used to access the account. |
| <CopyableCode code="organization_name" /> | `string` | Name of the organization. |
| <CopyableCode code="organization_old_url" /> | `string` | If the account’s organization was changed in a way that created a new account URL and the original account URL was saved, provides the original account URL. If the original account URL was dropped, the value is NULL even if the organization changed. |
| <CopyableCode code="organization_old_url_last_used" /> | `string` | If the account’s organization was changed in a way that created a new account URL and the original account URL was saved, indicates the last time the account was accessed using the original account URL. |
| <CopyableCode code="organization_old_url_saved_on" /> | `string` | If the account’s organization was changed in a way that created a new account URL and the original account URL was saved, provides the date and time when the original account URL was saved. |
| <CopyableCode code="polaris" /> | `boolean` | Indicates whether the account is a Polaris account. |
| <CopyableCode code="region" /> | `string` | Snowflake Region where the account is located. A Snowflake Region is a distinct location within a cloud platform region that is isolated from other Snowflake Regions. A Snowflake Region can be either multi-tenant or single-tenant (for a Virtual Private Snowflake account). |
| <CopyableCode code="region_group" /> | `string` | Region group where the account is located. Note - This column is only displayed for organizations that span multiple region groups. |
| <CopyableCode code="restored_on" /> | `string` | Date and time when the account was last restored. |
| <CopyableCode code="retention_time" /> | `integer` | Number of days that historical data is retained for Time Travel. |
| <CopyableCode code="scheduled_deletion_time" /> | `string` | Date and time when the account is scheduled to be permanently deleted. Accounts are deleted within one hour after the scheduled time. |

## Methods
| Name | Accessible by | Required Params | Optional Params | Description |
|:-----|:--------------|:----------------|:----------------|:------------|
| <CopyableCode code="list_accounts" /> | `SELECT` | <CopyableCode code="endpoint" /> | <CopyableCode code="like" />, <CopyableCode code="showLimit" />, <CopyableCode code="history" /> | Lists the accessible accounts. |
| <CopyableCode code="create_account" /> | `INSERT` | <CopyableCode code="data__admin_name, data__edition, data__email, data__name, endpoint" /> | - | Creates a account. You must provide the full account definition when creating a account. |
| <CopyableCode code="delete_account" /> | `DELETE` | <CopyableCode code="gracePeriodInDays, name, endpoint" /> | <CopyableCode code="ifExists" /> | Deletes the specified account. If you enable the `ifExists` parameter, the operation succeeds even if the account does not exist. Otherwise, a 404 failure is returned if the account does not exist. if the drop is unsuccessful. |
| <CopyableCode code="undrop_account" /> | `EXEC` | <CopyableCode code="name, endpoint" /> | - | Restores a dropped account that has not yet been permanently deleted (a dropped account that is within its grace period). |

<br />


<details>
<summary>Optional Parameter Details</summary>

| Name | Description | Type | Default |
|------|-------------|------|---------|
| <CopyableCode code="history" /> | Optionally includes dropped accounts that have not yet been purged. | `boolean` | `-` |
| <CopyableCode code="ifExists" /> | Query parameter that specifies how to handle the request for a resource that does not exist: - `true`: The endpoint does not throw an error if the resource does not exist. It returns a 200 success response, but does not take any action on the resource. - `false`: The endpoint throws an error if the resource doesn't exist. | `boolean` | `false` |
| <CopyableCode code="like" /> | Query parameter to filter the command output by resource name. Uses case-insensitive pattern matching, with support for SQL wildcard characters. | `string` | `-` |
| <CopyableCode code="showLimit" /> | Query parameter to limit the maximum number of rows returned by a command. | `integer` | `-` |

</details>

## `SELECT` examples

Lists the accessible accounts.


```sql
SELECT
name,
account_locator,
account_locator_url,
account_old_url_last_used,
account_old_url_saved_on,
account_url,
admin_name,
admin_password,
admin_rsa_public_key,
admin_user_type,
comment,
consumption_billing_entity_name,
created_on,
dropped_on,
edition,
email,
first_name,
is_events_account,
is_org_admin,
last_name,
managed_accounts,
marketplace_consumer_billing_entity_name,
marketplace_provider_billing_entity_name,
moved_on,
moved_to_organization,
must_change_password,
old_account_url,
organization_URL_expiration_on,
organization_name,
organization_old_url,
organization_old_url_last_used,
organization_old_url_saved_on,
polaris,
region,
region_group,
restored_on,
retention_time,
scheduled_deletion_time
FROM snowflake.account.accounts
WHERE endpoint = '{{ endpoint }}';
```
## `INSERT` example

Creates a account. You must provide the full account definition when creating a account.

<Tabs
    defaultValue="all"
    values={[
        { label: 'Required Properties', value: 'required' },
        { label: 'All Properties', value: 'all', },
        { label: 'Manifest', value: 'manifest', },
    ]
}>
<TabItem value="all">

```sql
/*+ create */
INSERT INTO snowflake.account.accounts (
data__name,
data__region_group,
data__region,
data__edition,
data__comment,
data__admin_name,
data__admin_password,
data__admin_rsa_public_key,
data__admin_user_type,
data__first_name,
data__last_name,
data__email,
data__must_change_password,
data__polaris,
endpoint
)
SELECT 
'{{ name }}',
'{{ region_group }}',
'{{ region }}',
'{{ edition }}',
'{{ comment }}',
'{{ admin_name }}',
'{{ admin_password }}',
'{{ admin_rsa_public_key }}',
'{{ admin_user_type }}',
'{{ first_name }}',
'{{ last_name }}',
'{{ email }}',
{{ must_change_password }},
{{ polaris }},
'{{ endpoint }}'
;
```
</TabItem>

<TabItem value="required">

```sql
/*+ create */
INSERT INTO snowflake.account.accounts (
data__name,
data__admin_name,
data__email,
data__edition,
endpoint
)
SELECT 
'{{ name }}',
'{{ admin_name }}',
'{{ email }}',
'{{ edition }}',
'{{ endpoint }}'
;
```
</TabItem>

<TabItem value="manifest">

```yaml
# Description fields below are for documentation purposes only and are not required in the manifest
- name: accounts
  props:
    - name: endpoint
      value: string
      description: Required parameter for the accounts resource.
    - name: name
      value: string
      description: >-
        A Snowflake object identifier. If the identifier contains spaces or
        special characters, the entire string must be enclosed in double quotes.
        Identifiers enclosed in double quotes are also case-sensitive. (Required
        parameter for the accounts resource.)
    - name: region_group
      value: string
      description: >-
        Region group where the account is located. Note - This column is only
        displayed for organizations that span multiple region groups.
    - name: region
      value: string
      description: >-
        Snowflake Region where the account is located. A Snowflake Region is a
        distinct location within a cloud platform region that is isolated from
        other Snowflake Regions. A Snowflake Region can be either multi-tenant
        or single-tenant (for a Virtual Private Snowflake account).
    - name: edition
      value: string
      description: >-
        Snowflake Edition of the account. (valid values: 'STANDARD',
        'ENTERPRISE', 'BUSINESS_CRITICAL') (Required parameter for the accounts
        resource.)
    - name: comment
      value: string
      description: Optional comment in which to store information related to the account.
    - name: admin_name
      value: string
      description: >-
        Name of the account administrator. (Required parameter for the accounts
        resource.)
    - name: admin_password
      value: string
      description: Password for the account administrator.
    - name: admin_rsa_public_key
      value: string
      description: RSA public key for the account administrator.
    - name: admin_user_type
      value: string
      description: User type of the account administrator.
    - name: first_name
      value: string
      description: First name of the account administrator.
    - name: last_name
      value: string
      description: Last name of the account administrator.
    - name: email
      value: string
      description: >-
        Email address of the account administrator. (Required parameter for the
        accounts resource.)
    - name: must_change_password
      value: boolean
      description: >-
        Indicates whether the account administrator must change the password at
        the next login.
      default: false
    - name: polaris
      value: boolean
      description: Indicates whether the account is a Polaris account.
      default: false
```
</TabItem>
</Tabs>

## `DELETE` example

Deletes the specified account. If you enable the `ifExists` parameter, the operation succeeds even if the account does not exist. Otherwise, a 404 failure is returned if the account does not exist. if the drop is unsuccessful.

```sql
/*+ delete */
DELETE FROM snowflake.account.accounts
WHERE gracePeriodInDays = '{{ gracePeriodInDays }}'
AND name = '{{ name }}'
AND endpoint = '{{ endpoint }}';
```
```

Key sections include:

- **Overview** basic resource info
- **Fields** these are the top level fields returned from the items array for a successful response, all of the data comes from the openapi spec
- **Methods** these are the stackql commands, their required params (usually path params and/or server variables) and optional params (typically header or query params)
    - we give a breakdown in a details foldout for the optional params (for all methods) which includes all of the descriptive info from the spec
- **`SELECT` examples** tabbed output with one tab per select method for the reosurce
- **`INSERT` example** tabbed with the tabs being the required params with templated values, all params version, and a manifest file to be used with `stackql-deploy`, this is essentially building a body for the request (including nested props)
- ** `UPDATE` and `REPLACE` examples not shown in this case but just a templated `UPDATE` statement (no manifest in this case)
- **`DELETE` example** delete example with templated params

I need each section in its own module for clarity