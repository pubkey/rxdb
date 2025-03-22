/*M!999999\- enable the sandbox mode */ 
-- MariaDB dump 10.19  Distrib 10.11.11-MariaDB, for debian-linux-gnu (x86_64)
--
-- Host: localhost    Database: 
-- ------------------------------------------------------
-- Server version	10.11.11-MariaDB-ubu2204

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Current Database: `appwrite`
--

/*!40000 DROP DATABASE IF EXISTS `appwrite`*/;

CREATE DATABASE /*!32312 IF NOT EXISTS*/ `appwrite` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci */;

USE `appwrite`;

--
-- Table structure for table `_1__metadata`
--

DROP TABLE IF EXISTS `_1__metadata`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_1__metadata` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_uid` varchar(255) NOT NULL,
  `_createdAt` datetime(3) DEFAULT NULL,
  `_updatedAt` datetime(3) DEFAULT NULL,
  `_permissions` mediumtext DEFAULT NULL,
  `name` varchar(256) DEFAULT NULL,
  `attributes` mediumtext DEFAULT NULL,
  `indexes` mediumtext DEFAULT NULL,
  `documentSecurity` tinyint(1) DEFAULT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_uid` (`_uid`),
  KEY `_created_at` (`_createdAt`),
  KEY `_updated_at` (`_updatedAt`)
) ENGINE=InnoDB AUTO_INCREMENT=28 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_1__metadata`
--

LOCK TABLES `_1__metadata` WRITE;
/*!40000 ALTER TABLE `_1__metadata` DISABLE KEYS */;
INSERT INTO `_1__metadata` VALUES
(1,'audit','2025-03-20 16:35:11.822','2025-03-20 16:35:11.822','[\"create(\\\"any\\\")\"]','audit','[{\"$id\":\"userId\",\"type\":\"string\",\"size\":255,\"required\":true,\"signed\":true,\"array\":false,\"filters\":[]},{\"$id\":\"event\",\"type\":\"string\",\"size\":255,\"required\":true,\"signed\":true,\"array\":false,\"filters\":[]},{\"$id\":\"resource\",\"type\":\"string\",\"size\":255,\"required\":false,\"signed\":true,\"array\":false,\"filters\":[]},{\"$id\":\"userAgent\",\"type\":\"string\",\"size\":65534,\"required\":true,\"signed\":true,\"array\":false,\"filters\":[]},{\"$id\":\"ip\",\"type\":\"string\",\"size\":45,\"required\":true,\"signed\":true,\"array\":false,\"filters\":[]},{\"$id\":\"location\",\"type\":\"string\",\"size\":45,\"required\":false,\"signed\":true,\"array\":false,\"filters\":[]},{\"$id\":\"time\",\"type\":\"datetime\",\"format\":\"\",\"size\":0,\"signed\":true,\"required\":false,\"array\":false,\"filters\":[\"datetime\"]},{\"$id\":\"data\",\"type\":\"string\",\"size\":16777216,\"required\":false,\"signed\":true,\"array\":false,\"filters\":[\"json\"]}]','[{\"$id\":\"index2\",\"type\":\"key\",\"attributes\":[\"event\"],\"lengths\":[],\"orders\":[]},{\"$id\":\"index4\",\"type\":\"key\",\"attributes\":[\"userId\",\"event\"],\"lengths\":[],\"orders\":[]},{\"$id\":\"index5\",\"type\":\"key\",\"attributes\":[\"resource\",\"event\"],\"lengths\":[],\"orders\":[]},{\"$id\":\"index-time\",\"type\":\"key\",\"attributes\":[\"time\"],\"lengths\":[],\"orders\":[\"DESC\"]}]',1),
(2,'abuse','2025-03-20 16:35:11.924','2025-03-20 16:35:11.924','[\"create(\\\"any\\\")\"]','abuse','[{\"$id\":\"key\",\"type\":\"string\",\"size\":255,\"required\":true,\"signed\":true,\"array\":false,\"filters\":[]},{\"$id\":\"time\",\"type\":\"datetime\",\"size\":0,\"required\":true,\"signed\":false,\"array\":false,\"filters\":[\"datetime\"]},{\"$id\":\"count\",\"type\":\"integer\",\"size\":11,\"required\":true,\"signed\":false,\"array\":false,\"filters\":[]}]','[{\"$id\":\"unique1\",\"type\":\"unique\",\"attributes\":[\"key\",\"time\"],\"lengths\":[],\"orders\":[]},{\"$id\":\"index2\",\"type\":\"key\",\"attributes\":[\"time\"],\"lengths\":[],\"orders\":[]}]',1),
(3,'databases','2025-03-20 16:35:12.084','2025-03-20 16:35:12.084','[\"create(\\\"any\\\")\"]','databases','[{\"$id\":\"name\",\"type\":\"string\",\"size\":256,\"required\":true,\"signed\":true,\"array\":false,\"filters\":[]},{\"$id\":\"enabled\",\"type\":\"boolean\",\"signed\":true,\"size\":0,\"format\":\"\",\"filters\":[],\"required\":false,\"default\":true,\"array\":false},{\"$id\":\"search\",\"type\":\"string\",\"format\":\"\",\"size\":16384,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"originalId\",\"type\":\"string\",\"signed\":true,\"size\":255,\"format\":\"\",\"filters\":[],\"required\":false,\"default\":null,\"array\":false}]','[{\"$id\":\"_fulltext_search\",\"type\":\"fulltext\",\"attributes\":[\"search\"],\"lengths\":[],\"orders\":[]},{\"$id\":\"_key_name\",\"type\":\"key\",\"attributes\":[\"name\"],\"lengths\":[256],\"orders\":[\"ASC\"]}]',1),
(4,'attributes','2025-03-20 16:35:12.183','2025-03-20 16:35:12.183','[\"create(\\\"any\\\")\"]','attributes','[{\"$id\":\"databaseInternalId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"databaseId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":false,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"collectionInternalId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"collectionId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"key\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"type\",\"type\":\"string\",\"format\":\"\",\"size\":256,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"status\",\"type\":\"string\",\"format\":\"\",\"size\":16,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"error\",\"type\":\"string\",\"format\":\"\",\"size\":2048,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"size\",\"type\":\"integer\",\"format\":\"\",\"size\":0,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"required\",\"type\":\"boolean\",\"format\":\"\",\"size\":0,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"default\",\"type\":\"string\",\"format\":\"\",\"size\":16384,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"casting\"]},{\"$id\":\"signed\",\"type\":\"boolean\",\"size\":0,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"array\",\"type\":\"boolean\",\"size\":0,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"format\",\"type\":\"string\",\"size\":64,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"formatOptions\",\"type\":\"string\",\"size\":16384,\"signed\":true,\"required\":false,\"default\":{},\"array\":false,\"filters\":[\"json\",\"range\",\"enum\"]},{\"$id\":\"filters\",\"type\":\"string\",\"size\":64,\"signed\":true,\"required\":false,\"default\":null,\"array\":true,\"filters\":[]},{\"$id\":\"options\",\"type\":\"string\",\"size\":16384,\"signed\":false,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"json\"]}]','[{\"$id\":\"_key_db_collection\",\"type\":\"key\",\"attributes\":[\"databaseInternalId\",\"collectionInternalId\"],\"lengths\":[255,255],\"orders\":[\"ASC\",\"ASC\"]}]',1),
(5,'indexes','2025-03-20 16:35:12.283','2025-03-20 16:35:12.283','[\"create(\\\"any\\\")\"]','indexes','[{\"$id\":\"databaseInternalId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"databaseId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":false,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"collectionInternalId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"collectionId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"key\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"type\",\"type\":\"string\",\"format\":\"\",\"size\":16,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"status\",\"type\":\"string\",\"format\":\"\",\"size\":16,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"error\",\"type\":\"string\",\"format\":\"\",\"size\":2048,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"attributes\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":true,\"filters\":[]},{\"$id\":\"lengths\",\"type\":\"integer\",\"format\":\"\",\"size\":0,\"signed\":true,\"required\":false,\"default\":null,\"array\":true,\"filters\":[]},{\"$id\":\"orders\",\"type\":\"string\",\"format\":\"\",\"size\":4,\"signed\":true,\"required\":false,\"default\":null,\"array\":true,\"filters\":[]}]','[{\"$id\":\"_key_db_collection\",\"type\":\"key\",\"attributes\":[\"databaseInternalId\",\"collectionInternalId\"],\"lengths\":[255,255],\"orders\":[\"ASC\",\"ASC\"]}]',1),
(6,'functions','2025-03-20 16:35:12.504','2025-03-20 16:35:12.504','[\"create(\\\"any\\\")\"]','functions','[{\"$id\":\"execute\",\"type\":\"string\",\"format\":\"\",\"size\":128,\"signed\":true,\"required\":false,\"default\":null,\"array\":true,\"filters\":[]},{\"$id\":\"name\",\"type\":\"string\",\"format\":\"\",\"size\":2048,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"enabled\",\"type\":\"boolean\",\"signed\":true,\"size\":0,\"format\":\"\",\"filters\":[],\"required\":true,\"array\":false},{\"$id\":\"live\",\"type\":\"boolean\",\"signed\":true,\"size\":0,\"format\":\"\",\"filters\":[],\"required\":true,\"array\":false},{\"$id\":\"installationId\",\"type\":\"string\",\"signed\":true,\"size\":255,\"format\":\"\",\"filters\":[],\"required\":false,\"array\":false},{\"$id\":\"installationInternalId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"providerRepositoryId\",\"type\":\"string\",\"signed\":true,\"size\":255,\"format\":\"\",\"filters\":[],\"required\":false,\"array\":false},{\"$id\":\"repositoryId\",\"type\":\"string\",\"signed\":true,\"size\":255,\"format\":\"\",\"filters\":[],\"required\":false,\"array\":false},{\"$id\":\"repositoryInternalId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"providerBranch\",\"type\":\"string\",\"signed\":true,\"size\":255,\"format\":\"\",\"filters\":[],\"required\":false,\"array\":false},{\"$id\":\"providerRootDirectory\",\"type\":\"string\",\"signed\":true,\"size\":255,\"format\":\"\",\"filters\":[],\"required\":false,\"array\":false},{\"$id\":\"providerSilentMode\",\"type\":\"boolean\",\"signed\":true,\"size\":0,\"format\":\"\",\"filters\":[],\"required\":false,\"default\":false,\"array\":false},{\"$id\":\"logging\",\"type\":\"boolean\",\"signed\":true,\"size\":0,\"format\":\"\",\"filters\":[],\"required\":true,\"array\":false},{\"$id\":\"runtime\",\"type\":\"string\",\"format\":\"\",\"size\":2048,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"deploymentInternalId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"deployment\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"vars\",\"type\":\"string\",\"format\":\"\",\"size\":16384,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"subQueryVariables\"]},{\"$id\":\"varsProject\",\"type\":\"string\",\"format\":\"\",\"size\":16384,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"subQueryProjectVariables\"]},{\"$id\":\"events\",\"type\":\"string\",\"format\":\"\",\"size\":256,\"signed\":true,\"required\":false,\"default\":null,\"array\":true,\"filters\":[]},{\"$id\":\"scheduleInternalId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"scheduleId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"schedule\",\"type\":\"string\",\"format\":\"\",\"size\":128,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"timeout\",\"type\":\"integer\",\"format\":\"\",\"size\":0,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"search\",\"type\":\"string\",\"format\":\"\",\"size\":16384,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"version\",\"type\":\"string\",\"format\":\"\",\"size\":8,\"signed\":true,\"required\":false,\"default\":\"v4\",\"array\":false,\"filters\":[]},{\"array\":false,\"$id\":\"entrypoint\",\"type\":\"string\",\"format\":\"\",\"size\":16384,\"signed\":true,\"required\":false,\"default\":null,\"filters\":[]},{\"array\":false,\"$id\":\"commands\",\"type\":\"string\",\"format\":\"\",\"size\":16384,\"signed\":true,\"required\":false,\"default\":null,\"filters\":[]},{\"array\":false,\"$id\":\"specification\",\"type\":\"string\",\"format\":\"\",\"size\":128,\"signed\":false,\"required\":false,\"default\":\"s-1vcpu-512mb\",\"filters\":[]},{\"$id\":\"scopes\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":[],\"array\":true,\"filters\":[]}]','[{\"$id\":\"_key_search\",\"type\":\"fulltext\",\"attributes\":[\"search\"],\"lengths\":[],\"orders\":[]},{\"$id\":\"_key_name\",\"type\":\"key\",\"attributes\":[\"name\"],\"lengths\":[256],\"orders\":[\"ASC\"]},{\"$id\":\"_key_enabled\",\"type\":\"key\",\"attributes\":[\"enabled\"],\"lengths\":[],\"orders\":[\"ASC\"]},{\"$id\":\"_key_installationId\",\"type\":\"key\",\"attributes\":[\"installationId\"],\"lengths\":[255],\"orders\":[\"ASC\"]},{\"$id\":\"_key_installationInternalId\",\"type\":\"key\",\"attributes\":[\"installationInternalId\"],\"lengths\":[255],\"orders\":[\"ASC\"]},{\"$id\":\"_key_providerRepositoryId\",\"type\":\"key\",\"attributes\":[\"providerRepositoryId\"],\"lengths\":[255],\"orders\":[\"ASC\"]},{\"$id\":\"_key_repositoryId\",\"type\":\"key\",\"attributes\":[\"repositoryId\"],\"lengths\":[255],\"orders\":[\"ASC\"]},{\"$id\":\"_key_repositoryInternalId\",\"type\":\"key\",\"attributes\":[\"repositoryInternalId\"],\"lengths\":[255],\"orders\":[\"ASC\"]},{\"$id\":\"_key_runtime\",\"type\":\"key\",\"attributes\":[\"runtime\"],\"lengths\":[64],\"orders\":[\"ASC\"]},{\"$id\":\"_key_deployment\",\"type\":\"key\",\"attributes\":[\"deployment\"],\"lengths\":[],\"orders\":[\"ASC\"]}]',1),
(7,'deployments','2025-03-20 16:35:12.698','2025-03-20 16:35:12.698','[\"create(\\\"any\\\")\"]','deployments','[{\"$id\":\"resourceInternalId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"resourceId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"resourceType\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"buildInternalId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"buildId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"array\":false,\"$id\":\"entrypoint\",\"type\":\"string\",\"format\":\"\",\"size\":2048,\"signed\":true,\"required\":false,\"default\":null,\"filters\":[]},{\"array\":false,\"$id\":\"commands\",\"type\":\"string\",\"format\":\"\",\"size\":2048,\"signed\":true,\"required\":false,\"default\":null,\"filters\":[]},{\"$id\":\"path\",\"type\":\"string\",\"format\":\"\",\"size\":2048,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"type\",\"type\":\"string\",\"format\":\"\",\"size\":2048,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"installationId\",\"type\":\"string\",\"signed\":true,\"size\":255,\"format\":\"\",\"filters\":[],\"required\":false,\"array\":false},{\"$id\":\"installationInternalId\",\"type\":\"string\",\"signed\":true,\"size\":255,\"format\":\"\",\"filters\":[],\"required\":false,\"array\":false},{\"$id\":\"providerRepositoryId\",\"type\":\"string\",\"signed\":true,\"size\":255,\"format\":\"\",\"filters\":[],\"required\":false,\"array\":false},{\"$id\":\"repositoryId\",\"type\":\"string\",\"signed\":true,\"size\":255,\"format\":\"\",\"filters\":[],\"required\":false,\"array\":false},{\"$id\":\"repositoryInternalId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"providerRepositoryName\",\"type\":\"string\",\"signed\":true,\"size\":255,\"format\":\"\",\"filters\":[],\"required\":false,\"array\":false},{\"$id\":\"providerRepositoryOwner\",\"type\":\"string\",\"signed\":true,\"size\":255,\"format\":\"\",\"filters\":[],\"required\":false,\"array\":false},{\"$id\":\"providerRepositoryUrl\",\"type\":\"string\",\"signed\":true,\"size\":255,\"format\":\"\",\"filters\":[],\"required\":false,\"array\":false},{\"$id\":\"providerCommitHash\",\"type\":\"string\",\"signed\":true,\"size\":255,\"format\":\"\",\"filters\":[],\"required\":false,\"array\":false},{\"$id\":\"providerCommitAuthorUrl\",\"type\":\"string\",\"signed\":true,\"size\":255,\"format\":\"\",\"filters\":[],\"required\":false,\"array\":false},{\"$id\":\"providerCommitAuthor\",\"type\":\"string\",\"signed\":true,\"size\":255,\"format\":\"\",\"filters\":[],\"required\":false,\"array\":false},{\"$id\":\"providerCommitMessage\",\"type\":\"string\",\"signed\":true,\"size\":255,\"format\":\"\",\"filters\":[],\"required\":false,\"array\":false},{\"$id\":\"providerCommitUrl\",\"type\":\"string\",\"signed\":true,\"size\":255,\"format\":\"\",\"filters\":[],\"required\":false,\"array\":false},{\"$id\":\"providerBranch\",\"type\":\"string\",\"signed\":true,\"size\":255,\"format\":\"\",\"filters\":[],\"required\":false,\"array\":false},{\"$id\":\"providerBranchUrl\",\"type\":\"string\",\"signed\":true,\"size\":255,\"format\":\"\",\"filters\":[],\"required\":false,\"array\":false},{\"$id\":\"providerRootDirectory\",\"type\":\"string\",\"signed\":true,\"size\":255,\"format\":\"\",\"filters\":[],\"required\":false,\"array\":false},{\"$id\":\"providerCommentId\",\"type\":\"string\",\"signed\":true,\"size\":2048,\"format\":\"\",\"filters\":[],\"required\":false,\"array\":false},{\"$id\":\"size\",\"type\":\"integer\",\"format\":\"\",\"size\":0,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"metadata\",\"type\":\"string\",\"format\":\"\",\"size\":16384,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"json\"]},{\"$id\":\"chunksTotal\",\"type\":\"integer\",\"format\":\"\",\"size\":0,\"signed\":false,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"chunksUploaded\",\"type\":\"integer\",\"format\":\"\",\"size\":0,\"signed\":false,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"search\",\"type\":\"string\",\"format\":\"\",\"size\":16384,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"activate\",\"type\":\"boolean\",\"format\":\"\",\"size\":0,\"signed\":true,\"required\":false,\"default\":false,\"array\":false,\"filters\":[]}]','[{\"$id\":\"_key_resource\",\"type\":\"key\",\"attributes\":[\"resourceId\"],\"lengths\":[],\"orders\":[\"ASC\"]},{\"$id\":\"_key_resource_type\",\"type\":\"key\",\"attributes\":[\"resourceType\"],\"lengths\":[],\"orders\":[\"ASC\"]},{\"$id\":\"_key_search\",\"type\":\"fulltext\",\"attributes\":[\"search\"],\"lengths\":[],\"orders\":[]},{\"$id\":\"_key_size\",\"type\":\"key\",\"attributes\":[\"size\"],\"lengths\":[],\"orders\":[\"ASC\"]},{\"$id\":\"_key_buildId\",\"type\":\"key\",\"attributes\":[\"buildId\"],\"lengths\":[],\"orders\":[\"ASC\"]},{\"$id\":\"_key_activate\",\"type\":\"key\",\"attributes\":[\"activate\"],\"lengths\":[],\"orders\":[\"ASC\"]}]',1),
(8,'builds','2025-03-20 16:35:12.822','2025-03-20 16:35:12.822','[\"create(\\\"any\\\")\"]','builds','[{\"$id\":\"startTime\",\"type\":\"datetime\",\"format\":\"\",\"size\":0,\"signed\":false,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"datetime\"]},{\"$id\":\"endTime\",\"type\":\"datetime\",\"format\":\"\",\"size\":0,\"signed\":false,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"datetime\"]},{\"$id\":\"duration\",\"type\":\"integer\",\"format\":\"\",\"size\":0,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"size\",\"type\":\"integer\",\"format\":\"\",\"size\":0,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"deploymentInternalId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"deploymentId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"runtime\",\"type\":\"string\",\"format\":\"\",\"size\":2048,\"signed\":true,\"required\":true,\"default\":\"\",\"array\":false,\"filters\":[]},{\"$id\":\"status\",\"type\":\"string\",\"format\":\"\",\"size\":256,\"signed\":true,\"required\":true,\"default\":\"processing\",\"array\":false,\"filters\":[]},{\"$id\":\"path\",\"type\":\"string\",\"format\":\"\",\"size\":2048,\"signed\":true,\"required\":false,\"default\":\"\",\"array\":false,\"filters\":[]},{\"$id\":\"logs\",\"type\":\"string\",\"format\":\"\",\"size\":1000000,\"signed\":true,\"required\":false,\"default\":\"\",\"array\":false,\"filters\":[]},{\"$id\":\"sourceType\",\"type\":\"string\",\"format\":\"\",\"size\":2048,\"signed\":true,\"required\":true,\"default\":\"local\",\"array\":false,\"filters\":[]},{\"$id\":\"source\",\"type\":\"string\",\"format\":\"\",\"size\":2048,\"signed\":true,\"required\":true,\"default\":\"\",\"array\":false,\"filters\":[]}]','[{\"$id\":\"_key_deployment\",\"type\":\"key\",\"attributes\":[\"deploymentId\"],\"lengths\":[255],\"orders\":[\"ASC\"]}]',1),
(9,'executions','2025-03-20 16:35:13.059','2025-03-20 16:35:13.059','[\"create(\\\"any\\\")\"]','executions','[{\"$id\":\"functionInternalId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"functionId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"deploymentInternalId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"deploymentId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"array\":false,\"$id\":\"trigger\",\"type\":\"string\",\"format\":\"\",\"size\":128,\"signed\":true,\"required\":false,\"default\":null,\"filters\":[]},{\"$id\":\"status\",\"type\":\"string\",\"format\":\"\",\"size\":128,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"duration\",\"type\":\"double\",\"format\":\"\",\"size\":0,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"errors\",\"type\":\"string\",\"format\":\"\",\"size\":1000000,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"logs\",\"type\":\"string\",\"format\":\"\",\"size\":1000000,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"array\":false,\"$id\":\"requestMethod\",\"type\":\"string\",\"format\":\"\",\"size\":128,\"signed\":true,\"required\":false,\"default\":null,\"filters\":[]},{\"array\":false,\"$id\":\"requestPath\",\"type\":\"string\",\"format\":\"\",\"size\":2048,\"signed\":true,\"required\":false,\"default\":null,\"filters\":[]},{\"$id\":\"requestHeaders\",\"type\":\"string\",\"format\":\"\",\"size\":16384,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"json\"]},{\"$id\":\"responseStatusCode\",\"type\":\"integer\",\"format\":\"\",\"size\":0,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"responseHeaders\",\"type\":\"string\",\"format\":\"\",\"size\":16384,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"json\"]},{\"$id\":\"search\",\"type\":\"string\",\"format\":\"\",\"size\":16384,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"scheduledAt\",\"type\":\"datetime\",\"format\":\"\",\"size\":0,\"signed\":false,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"datetime\"]},{\"$id\":\"scheduleInternalId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"scheduleId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]}]','[{\"$id\":\"_key_function\",\"type\":\"key\",\"attributes\":[\"functionId\"],\"lengths\":[255],\"orders\":[\"ASC\"]},{\"$id\":\"_fulltext_search\",\"type\":\"fulltext\",\"attributes\":[\"search\"],\"lengths\":[],\"orders\":[]},{\"$id\":\"_key_trigger\",\"type\":\"key\",\"attributes\":[\"trigger\"],\"lengths\":[32],\"orders\":[\"ASC\"]},{\"$id\":\"_key_status\",\"type\":\"key\",\"attributes\":[\"status\"],\"lengths\":[32],\"orders\":[\"ASC\"]},{\"$id\":\"_key_requestMethod\",\"type\":\"key\",\"attributes\":[\"requestMethod\"],\"lengths\":[128],\"orders\":[\"ASC\"]},{\"$id\":\"_key_requestPath\",\"type\":\"key\",\"attributes\":[\"requestPath\"],\"lengths\":[255],\"orders\":[\"ASC\"]},{\"$id\":\"_key_deployment\",\"type\":\"key\",\"attributes\":[\"deploymentId\"],\"lengths\":[255],\"orders\":[\"ASC\"]},{\"$id\":\"_key_responseStatusCode\",\"type\":\"key\",\"attributes\":[\"responseStatusCode\"],\"lengths\":[],\"orders\":[\"ASC\"]},{\"$id\":\"_key_duration\",\"type\":\"key\",\"attributes\":[\"duration\"],\"lengths\":[],\"orders\":[\"ASC\"]}]',1),
(10,'variables','2025-03-20 16:35:13.246','2025-03-20 16:35:13.246','[\"create(\\\"any\\\")\"]','variables','[{\"$id\":\"resourceType\",\"type\":\"string\",\"format\":\"\",\"size\":100,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"resourceInternalId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"resourceId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"key\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"value\",\"type\":\"string\",\"format\":\"\",\"size\":8192,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[\"encrypt\"]},{\"$id\":\"search\",\"type\":\"string\",\"format\":\"\",\"size\":16384,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]}]','[{\"$id\":\"_key_resourceInternalId\",\"type\":\"key\",\"attributes\":[\"resourceInternalId\"],\"lengths\":[255],\"orders\":[]},{\"$id\":\"_key_resourceType\",\"type\":\"key\",\"attributes\":[\"resourceType\"],\"lengths\":[],\"orders\":[\"ASC\"]},{\"$id\":\"_key_resourceId_resourceType\",\"type\":\"key\",\"attributes\":[\"resourceId\",\"resourceType\"],\"lengths\":[255,100],\"orders\":[\"ASC\",\"ASC\"]},{\"$id\":\"_key_uniqueKey\",\"type\":\"unique\",\"attributes\":[\"resourceId\",\"key\",\"resourceType\"],\"lengths\":[255,255,100],\"orders\":[\"ASC\",\"ASC\",\"ASC\"]},{\"$id\":\"_key_key\",\"type\":\"key\",\"attributes\":[\"key\"],\"lengths\":[255],\"orders\":[\"ASC\"]},{\"$id\":\"_fulltext_search\",\"type\":\"fulltext\",\"attributes\":[\"search\"],\"lengths\":[],\"orders\":[]}]',1),
(11,'migrations','2025-03-20 16:35:13.412','2025-03-20 16:35:13.412','[\"create(\\\"any\\\")\"]','migrations','[{\"$id\":\"status\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"stage\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"source\",\"type\":\"string\",\"format\":\"\",\"size\":8192,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"destination\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"credentials\",\"type\":\"string\",\"format\":\"\",\"size\":65536,\"signed\":true,\"required\":false,\"default\":[],\"array\":false,\"filters\":[\"json\",\"encrypt\"]},{\"$id\":\"resources\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":true,\"default\":[],\"array\":true,\"filters\":[]},{\"$id\":\"statusCounters\",\"type\":\"string\",\"format\":\"\",\"size\":3000,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[\"json\"]},{\"$id\":\"resourceData\",\"type\":\"string\",\"format\":\"\",\"size\":131070,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[\"json\"]},{\"$id\":\"errors\",\"type\":\"string\",\"format\":\"\",\"size\":65535,\"signed\":true,\"required\":true,\"default\":null,\"array\":true,\"filters\":[]},{\"$id\":\"search\",\"type\":\"string\",\"format\":\"\",\"size\":16384,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]}]','[{\"$id\":\"_key_status\",\"type\":\"key\",\"attributes\":[\"status\"],\"lengths\":[255],\"orders\":[\"ASC\"]},{\"$id\":\"_key_stage\",\"type\":\"key\",\"attributes\":[\"stage\"],\"lengths\":[255],\"orders\":[\"ASC\"]},{\"$id\":\"_key_source\",\"type\":\"key\",\"attributes\":[\"source\"],\"lengths\":[255],\"orders\":[\"ASC\"]},{\"$id\":\"_fulltext_search\",\"type\":\"fulltext\",\"attributes\":[\"search\"],\"lengths\":[],\"orders\":[]}]',1),
(12,'cache','2025-03-20 16:35:13.516','2025-03-20 16:35:13.516','[\"create(\\\"any\\\")\"]','cache','[{\"$id\":\"resource\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"resourceType\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"mimeType\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"accessedAt\",\"type\":\"datetime\",\"format\":\"\",\"size\":0,\"signed\":false,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"datetime\"]},{\"$id\":\"signature\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]}]','[{\"$id\":\"_key_accessedAt\",\"type\":\"key\",\"attributes\":[\"accessedAt\"],\"lengths\":[],\"orders\":[]},{\"$id\":\"_key_resource\",\"type\":\"key\",\"attributes\":[\"resource\"],\"lengths\":[],\"orders\":[]}]',1),
(13,'users','2025-03-20 16:35:13.735','2025-03-20 16:35:13.735','[\"create(\\\"any\\\")\"]','users','[{\"$id\":\"name\",\"type\":\"string\",\"format\":\"\",\"size\":256,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"email\",\"type\":\"string\",\"format\":\"\",\"size\":320,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"phone\",\"type\":\"string\",\"format\":\"\",\"size\":16,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"status\",\"type\":\"boolean\",\"format\":\"\",\"size\":0,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"labels\",\"type\":\"string\",\"format\":\"\",\"size\":128,\"signed\":true,\"required\":false,\"default\":null,\"array\":true,\"filters\":[]},{\"$id\":\"passwordHistory\",\"type\":\"string\",\"format\":\"\",\"size\":16384,\"signed\":true,\"required\":false,\"default\":null,\"array\":true,\"filters\":[]},{\"$id\":\"password\",\"type\":\"string\",\"format\":\"\",\"size\":16384,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"encrypt\"]},{\"$id\":\"hash\",\"type\":\"string\",\"format\":\"\",\"size\":256,\"signed\":true,\"required\":false,\"default\":\"argon2\",\"array\":false,\"filters\":[]},{\"$id\":\"hashOptions\",\"type\":\"string\",\"format\":\"\",\"size\":65535,\"signed\":true,\"required\":false,\"default\":{\"type\":\"argon2\",\"memoryCost\":2048,\"timeCost\":4,\"threads\":3},\"array\":false,\"filters\":[\"json\"]},{\"$id\":\"passwordUpdate\",\"type\":\"datetime\",\"format\":\"\",\"size\":0,\"signed\":false,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"datetime\"]},{\"$id\":\"prefs\",\"type\":\"string\",\"format\":\"\",\"size\":65535,\"signed\":true,\"required\":false,\"default\":{},\"array\":false,\"filters\":[\"json\"]},{\"$id\":\"registration\",\"type\":\"datetime\",\"format\":\"\",\"size\":0,\"signed\":false,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"datetime\"]},{\"$id\":\"emailVerification\",\"type\":\"boolean\",\"format\":\"\",\"size\":0,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"phoneVerification\",\"type\":\"boolean\",\"format\":\"\",\"size\":0,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"reset\",\"type\":\"boolean\",\"format\":\"\",\"size\":0,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"mfa\",\"type\":\"boolean\",\"format\":\"\",\"size\":0,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"mfaRecoveryCodes\",\"type\":\"string\",\"format\":\"\",\"size\":256,\"signed\":true,\"required\":false,\"default\":[],\"array\":true,\"filters\":[\"encrypt\"]},{\"$id\":\"authenticators\",\"type\":\"string\",\"format\":\"\",\"size\":16384,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"subQueryAuthenticators\"]},{\"$id\":\"sessions\",\"type\":\"string\",\"format\":\"\",\"size\":16384,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"subQuerySessions\"]},{\"$id\":\"tokens\",\"type\":\"string\",\"format\":\"\",\"size\":16384,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"subQueryTokens\"]},{\"$id\":\"challenges\",\"type\":\"string\",\"format\":\"\",\"size\":16384,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"subQueryChallenges\"]},{\"$id\":\"memberships\",\"type\":\"string\",\"format\":\"\",\"size\":16384,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"subQueryMemberships\"]},{\"$id\":\"targets\",\"type\":\"string\",\"format\":\"\",\"size\":16384,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"subQueryTargets\"]},{\"$id\":\"search\",\"type\":\"string\",\"format\":\"\",\"size\":16384,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"userSearch\"]},{\"$id\":\"accessedAt\",\"type\":\"datetime\",\"format\":\"\",\"size\":0,\"signed\":false,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"datetime\"]}]','[{\"$id\":\"_key_name\",\"type\":\"key\",\"attributes\":[\"name\"],\"lengths\":[256],\"orders\":[\"ASC\"]},{\"$id\":\"_key_email\",\"type\":\"unique\",\"attributes\":[\"email\"],\"lengths\":[256],\"orders\":[\"ASC\"]},{\"$id\":\"_key_phone\",\"type\":\"unique\",\"attributes\":[\"phone\"],\"lengths\":[16],\"orders\":[\"ASC\"]},{\"$id\":\"_key_status\",\"type\":\"key\",\"attributes\":[\"status\"],\"lengths\":[],\"orders\":[\"ASC\"]},{\"$id\":\"_key_passwordUpdate\",\"type\":\"key\",\"attributes\":[\"passwordUpdate\"],\"lengths\":[],\"orders\":[\"ASC\"]},{\"$id\":\"_key_registration\",\"type\":\"key\",\"attributes\":[\"registration\"],\"lengths\":[],\"orders\":[\"ASC\"]},{\"$id\":\"_key_emailVerification\",\"type\":\"key\",\"attributes\":[\"emailVerification\"],\"lengths\":[],\"orders\":[\"ASC\"]},{\"$id\":\"_key_phoneVerification\",\"type\":\"key\",\"attributes\":[\"phoneVerification\"],\"lengths\":[],\"orders\":[\"ASC\"]},{\"$id\":\"_key_search\",\"type\":\"fulltext\",\"attributes\":[\"search\"],\"lengths\":[],\"orders\":[]},{\"$id\":\"_key_accessedAt\",\"type\":\"key\",\"attributes\":[\"accessedAt\"],\"lengths\":[],\"orders\":[]}]',1),
(14,'tokens','2025-03-20 16:35:13.844','2025-03-20 16:35:13.844','[\"create(\\\"any\\\")\"]','tokens','[{\"$id\":\"userInternalId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"userId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"type\",\"type\":\"integer\",\"format\":\"\",\"size\":0,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"secret\",\"type\":\"string\",\"format\":\"\",\"size\":512,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"encrypt\"]},{\"$id\":\"expire\",\"type\":\"datetime\",\"format\":\"\",\"size\":0,\"signed\":false,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"datetime\"]},{\"$id\":\"userAgent\",\"type\":\"string\",\"format\":\"\",\"size\":16384,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"ip\",\"type\":\"string\",\"format\":\"\",\"size\":45,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]}]','[{\"$id\":\"_key_user\",\"type\":\"key\",\"attributes\":[\"userInternalId\"],\"lengths\":[255],\"orders\":[\"ASC\"]}]',1),
(15,'authenticators','2025-03-20 16:35:13.939','2025-03-20 16:35:13.939','[\"create(\\\"any\\\")\"]','authenticators','[{\"$id\":\"userInternalId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"userId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"type\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"verified\",\"type\":\"boolean\",\"format\":\"\",\"size\":0,\"signed\":true,\"required\":false,\"default\":false,\"array\":false,\"filters\":[]},{\"$id\":\"data\",\"type\":\"string\",\"format\":\"\",\"size\":65535,\"signed\":true,\"required\":false,\"default\":[],\"array\":false,\"filters\":[\"json\",\"encrypt\"]}]','[{\"$id\":\"_key_userInternalId\",\"type\":\"key\",\"attributes\":[\"userInternalId\"],\"lengths\":[255],\"orders\":[\"ASC\"]}]',1),
(16,'challenges','2025-03-20 16:35:14.052','2025-03-20 16:35:14.052','[\"create(\\\"any\\\")\"]','challenges','[{\"$id\":\"userInternalId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"userId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"type\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"token\",\"type\":\"string\",\"format\":\"\",\"size\":512,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"encrypt\"]},{\"$id\":\"code\",\"type\":\"string\",\"format\":\"\",\"size\":512,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"encrypt\"]},{\"$id\":\"expire\",\"type\":\"datetime\",\"format\":\"\",\"size\":0,\"signed\":false,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"datetime\"]}]','[{\"$id\":\"_key_user\",\"type\":\"key\",\"attributes\":[\"userInternalId\"],\"lengths\":[255],\"orders\":[\"ASC\"]}]',1),
(17,'sessions','2025-03-20 16:35:14.161','2025-03-20 16:35:14.161','[\"create(\\\"any\\\")\"]','sessions','[{\"$id\":\"userInternalId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"userId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"provider\",\"type\":\"string\",\"format\":\"\",\"size\":128,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"providerUid\",\"type\":\"string\",\"format\":\"\",\"size\":2048,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"providerAccessToken\",\"type\":\"string\",\"format\":\"\",\"size\":16384,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"encrypt\"]},{\"$id\":\"providerAccessTokenExpiry\",\"type\":\"datetime\",\"format\":\"\",\"size\":0,\"signed\":false,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"datetime\"]},{\"$id\":\"providerRefreshToken\",\"type\":\"string\",\"format\":\"\",\"size\":16384,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"encrypt\"]},{\"$id\":\"secret\",\"type\":\"string\",\"format\":\"\",\"size\":512,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"encrypt\"]},{\"$id\":\"userAgent\",\"type\":\"string\",\"format\":\"\",\"size\":16384,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"ip\",\"type\":\"string\",\"format\":\"\",\"size\":45,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"countryCode\",\"type\":\"string\",\"format\":\"\",\"size\":2,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"osCode\",\"type\":\"string\",\"format\":\"\",\"size\":256,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"osName\",\"type\":\"string\",\"format\":\"\",\"size\":256,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"osVersion\",\"type\":\"string\",\"format\":\"\",\"size\":256,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"clientType\",\"type\":\"string\",\"format\":\"\",\"size\":256,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"clientCode\",\"type\":\"string\",\"format\":\"\",\"size\":256,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"clientName\",\"type\":\"string\",\"format\":\"\",\"size\":256,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"clientVersion\",\"type\":\"string\",\"format\":\"\",\"size\":256,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"clientEngine\",\"type\":\"string\",\"format\":\"\",\"size\":256,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"clientEngineVersion\",\"type\":\"string\",\"format\":\"\",\"size\":256,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"deviceName\",\"type\":\"string\",\"format\":\"\",\"size\":256,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"deviceBrand\",\"type\":\"string\",\"format\":\"\",\"size\":256,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"deviceModel\",\"type\":\"string\",\"format\":\"\",\"size\":256,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"factors\",\"type\":\"string\",\"format\":\"\",\"size\":256,\"signed\":true,\"required\":false,\"default\":[],\"array\":true,\"filters\":[]},{\"$id\":\"expire\",\"type\":\"datetime\",\"format\":\"\",\"size\":0,\"signed\":false,\"required\":true,\"default\":null,\"array\":false,\"filters\":[\"datetime\"]},{\"$id\":\"mfaUpdatedAt\",\"type\":\"datetime\",\"format\":\"\",\"size\":0,\"signed\":false,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"datetime\"]}]','[{\"$id\":\"_key_provider_providerUid\",\"type\":\"key\",\"attributes\":[\"provider\",\"providerUid\"],\"lengths\":[128,128],\"orders\":[\"ASC\",\"ASC\"]},{\"$id\":\"_key_user\",\"type\":\"key\",\"attributes\":[\"userInternalId\"],\"lengths\":[255],\"orders\":[\"ASC\"]}]',1),
(18,'identities','2025-03-20 16:35:14.321','2025-03-20 16:35:14.321','[\"create(\\\"any\\\")\"]','identities','[{\"$id\":\"userInternalId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"userId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"provider\",\"type\":\"string\",\"format\":\"\",\"size\":128,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"providerUid\",\"type\":\"string\",\"format\":\"\",\"size\":2048,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"providerEmail\",\"type\":\"string\",\"format\":\"\",\"size\":320,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"providerAccessToken\",\"type\":\"string\",\"format\":\"\",\"size\":16384,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"encrypt\"]},{\"$id\":\"providerAccessTokenExpiry\",\"type\":\"datetime\",\"format\":\"\",\"size\":0,\"signed\":false,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"datetime\"]},{\"$id\":\"providerRefreshToken\",\"type\":\"string\",\"format\":\"\",\"size\":16384,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"encrypt\"]},{\"$id\":\"secrets\",\"type\":\"string\",\"format\":\"\",\"size\":16384,\"signed\":true,\"required\":false,\"default\":[],\"array\":false,\"filters\":[\"json\",\"encrypt\"]}]','[{\"$id\":\"_key_userInternalId_provider_providerUid\",\"type\":\"unique\",\"attributes\":[\"userInternalId\",\"provider\",\"providerUid\"],\"lengths\":[11,128,128],\"orders\":[\"ASC\",\"ASC\"]},{\"$id\":\"_key_provider_providerUid\",\"type\":\"unique\",\"attributes\":[\"provider\",\"providerUid\"],\"lengths\":[128,128],\"orders\":[\"ASC\",\"ASC\"]},{\"$id\":\"_key_userId\",\"type\":\"key\",\"attributes\":[\"userId\"],\"lengths\":[255],\"orders\":[\"ASC\"]},{\"$id\":\"_key_userInternalId\",\"type\":\"key\",\"attributes\":[\"userInternalId\"],\"lengths\":[255],\"orders\":[\"ASC\"]},{\"$id\":\"_key_provider\",\"type\":\"key\",\"attributes\":[\"provider\"],\"lengths\":[128],\"orders\":[\"ASC\"]},{\"$id\":\"_key_providerUid\",\"type\":\"key\",\"attributes\":[\"providerUid\"],\"lengths\":[255],\"orders\":[\"ASC\"]},{\"$id\":\"_key_providerEmail\",\"type\":\"key\",\"attributes\":[\"providerEmail\"],\"lengths\":[255],\"orders\":[\"ASC\"]},{\"$id\":\"_key_providerAccessTokenExpiry\",\"type\":\"key\",\"attributes\":[\"providerAccessTokenExpiry\"],\"lengths\":[],\"orders\":[\"ASC\"]}]',1),
(19,'teams','2025-03-20 16:35:14.503','2025-03-20 16:35:14.503','[\"create(\\\"any\\\")\"]','teams','[{\"$id\":\"name\",\"type\":\"string\",\"format\":\"\",\"size\":128,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"total\",\"type\":\"integer\",\"format\":\"\",\"size\":0,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"search\",\"type\":\"string\",\"format\":\"\",\"size\":16384,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"prefs\",\"type\":\"string\",\"format\":\"\",\"size\":65535,\"signed\":true,\"required\":false,\"default\":{},\"array\":false,\"filters\":[\"json\"]}]','[{\"$id\":\"_key_search\",\"type\":\"fulltext\",\"attributes\":[\"search\"],\"lengths\":[],\"orders\":[]},{\"$id\":\"_key_name\",\"type\":\"key\",\"attributes\":[\"name\"],\"lengths\":[128],\"orders\":[\"ASC\"]},{\"$id\":\"_key_total\",\"type\":\"key\",\"attributes\":[\"total\"],\"lengths\":[],\"orders\":[\"ASC\"]}]',1),
(20,'memberships','2025-03-20 16:35:14.737','2025-03-20 16:35:14.737','[\"create(\\\"any\\\")\"]','memberships','[{\"$id\":\"userInternalId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"userId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"teamInternalId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"teamId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"roles\",\"type\":\"string\",\"format\":\"\",\"size\":128,\"signed\":true,\"required\":false,\"default\":null,\"array\":true,\"filters\":[]},{\"$id\":\"invited\",\"type\":\"datetime\",\"format\":\"\",\"size\":0,\"signed\":false,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"datetime\"]},{\"$id\":\"joined\",\"type\":\"datetime\",\"format\":\"\",\"size\":0,\"signed\":false,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"datetime\"]},{\"$id\":\"confirm\",\"type\":\"boolean\",\"format\":\"\",\"size\":0,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"secret\",\"type\":\"string\",\"format\":\"\",\"size\":256,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"encrypt\"]},{\"$id\":\"search\",\"type\":\"string\",\"format\":\"\",\"size\":16384,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]}]','[{\"$id\":\"_key_unique\",\"type\":\"unique\",\"attributes\":[\"teamInternalId\",\"userInternalId\"],\"lengths\":[255,255],\"orders\":[\"ASC\",\"ASC\"]},{\"$id\":\"_key_user\",\"type\":\"key\",\"attributes\":[\"userInternalId\"],\"lengths\":[255],\"orders\":[\"ASC\"]},{\"$id\":\"_key_team\",\"type\":\"key\",\"attributes\":[\"teamInternalId\"],\"lengths\":[255],\"orders\":[\"ASC\"]},{\"$id\":\"_key_search\",\"type\":\"fulltext\",\"attributes\":[\"search\"],\"lengths\":[],\"orders\":[]},{\"$id\":\"_key_userId\",\"type\":\"key\",\"attributes\":[\"userId\"],\"lengths\":[255],\"orders\":[\"ASC\"]},{\"$id\":\"_key_teamId\",\"type\":\"key\",\"attributes\":[\"teamId\"],\"lengths\":[255],\"orders\":[\"ASC\"]},{\"$id\":\"_key_invited\",\"type\":\"key\",\"attributes\":[\"invited\"],\"lengths\":[],\"orders\":[\"ASC\"]},{\"$id\":\"_key_joined\",\"type\":\"key\",\"attributes\":[\"joined\"],\"lengths\":[],\"orders\":[\"ASC\"]},{\"$id\":\"_key_confirm\",\"type\":\"key\",\"attributes\":[\"confirm\"],\"lengths\":[],\"orders\":[\"ASC\"]}]',1),
(21,'buckets','2025-03-20 16:35:14.963','2025-03-20 16:35:14.963','[\"create(\\\"any\\\")\"]','buckets','[{\"$id\":\"enabled\",\"type\":\"boolean\",\"signed\":true,\"size\":0,\"format\":\"\",\"filters\":[],\"required\":true,\"array\":false},{\"$id\":\"name\",\"type\":\"string\",\"signed\":true,\"size\":128,\"format\":\"\",\"filters\":[],\"required\":true,\"array\":false},{\"$id\":\"fileSecurity\",\"type\":\"boolean\",\"signed\":true,\"size\":1,\"format\":\"\",\"filters\":[],\"required\":false,\"array\":false},{\"$id\":\"maximumFileSize\",\"type\":\"integer\",\"signed\":false,\"size\":8,\"format\":\"\",\"filters\":[],\"required\":true,\"array\":false},{\"$id\":\"allowedFileExtensions\",\"type\":\"string\",\"signed\":true,\"size\":64,\"format\":\"\",\"filters\":[],\"required\":true,\"array\":true},{\"$id\":\"compression\",\"type\":\"string\",\"signed\":true,\"size\":10,\"format\":\"\",\"filters\":[],\"required\":true,\"array\":false},{\"$id\":\"encryption\",\"type\":\"boolean\",\"signed\":true,\"size\":0,\"format\":\"\",\"filters\":[],\"required\":true,\"array\":false},{\"$id\":\"antivirus\",\"type\":\"boolean\",\"signed\":true,\"size\":0,\"format\":\"\",\"filters\":[],\"required\":true,\"array\":false},{\"$id\":\"search\",\"type\":\"string\",\"format\":\"\",\"size\":16384,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]}]','[{\"$id\":\"_fulltext_name\",\"type\":\"fulltext\",\"attributes\":[\"name\"],\"lengths\":[],\"orders\":[]},{\"$id\":\"_key_search\",\"type\":\"fulltext\",\"attributes\":[\"search\"],\"lengths\":[],\"orders\":[]},{\"$id\":\"_key_enabled\",\"type\":\"key\",\"attributes\":[\"enabled\"],\"lengths\":[],\"orders\":[\"ASC\"]},{\"$id\":\"_key_name\",\"type\":\"key\",\"attributes\":[\"name\"],\"lengths\":[],\"orders\":[\"ASC\"]},{\"$id\":\"_key_fileSecurity\",\"type\":\"key\",\"attributes\":[\"fileSecurity\"],\"lengths\":[],\"orders\":[\"ASC\"]},{\"$id\":\"_key_maximumFileSize\",\"type\":\"key\",\"attributes\":[\"maximumFileSize\"],\"lengths\":[],\"orders\":[\"ASC\"]},{\"$id\":\"_key_encryption\",\"type\":\"key\",\"attributes\":[\"encryption\"],\"lengths\":[],\"orders\":[\"ASC\"]},{\"$id\":\"_key_antivirus\",\"type\":\"key\",\"attributes\":[\"antivirus\"],\"lengths\":[],\"orders\":[\"ASC\"]}]',1),
(22,'stats','2025-03-20 16:35:15.087','2025-03-20 16:35:15.087','[\"create(\\\"any\\\")\"]','stats','[{\"$id\":\"metric\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"region\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"value\",\"type\":\"integer\",\"format\":\"\",\"size\":8,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"time\",\"type\":\"datetime\",\"format\":\"\",\"size\":0,\"signed\":false,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"datetime\"]},{\"$id\":\"period\",\"type\":\"string\",\"format\":\"\",\"size\":4,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]}]','[{\"$id\":\"_key_time\",\"type\":\"key\",\"attributes\":[\"time\"],\"lengths\":[],\"orders\":[\"DESC\"]},{\"$id\":\"_key_period_time\",\"type\":\"key\",\"attributes\":[\"period\",\"time\"],\"lengths\":[],\"orders\":[\"ASC\"]},{\"$id\":\"_key_metric_period_time\",\"type\":\"unique\",\"attributes\":[\"metric\",\"period\",\"time\"],\"lengths\":[],\"orders\":[\"DESC\"]}]',1),
(23,'providers','2025-03-20 16:35:15.267','2025-03-20 16:35:15.267','[\"create(\\\"any\\\")\"]','providers','[{\"$id\":\"name\",\"type\":\"string\",\"format\":\"\",\"size\":128,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"provider\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"type\",\"type\":\"string\",\"format\":\"\",\"size\":128,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"enabled\",\"type\":\"boolean\",\"signed\":true,\"size\":0,\"format\":\"\",\"filters\":[],\"required\":true,\"default\":true,\"array\":false},{\"$id\":\"credentials\",\"type\":\"string\",\"format\":\"\",\"size\":16384,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[\"json\",\"encrypt\"]},{\"$id\":\"options\",\"type\":\"string\",\"format\":\"\",\"size\":16384,\"signed\":true,\"required\":false,\"default\":[],\"array\":false,\"filters\":[\"json\"]},{\"$id\":\"search\",\"type\":\"string\",\"format\":\"\",\"size\":65535,\"signed\":true,\"required\":false,\"default\":\"\",\"array\":false,\"filters\":[\"providerSearch\"]}]','[{\"$id\":\"_key_provider\",\"type\":\"key\",\"attributes\":[\"provider\"],\"lengths\":[],\"orders\":[\"ASC\"]},{\"$id\":\"_key_name\",\"type\":\"fulltext\",\"attributes\":[\"name\"],\"lengths\":[],\"orders\":[\"ASC\"]},{\"$id\":\"_key_type\",\"type\":\"key\",\"attributes\":[\"type\"],\"lengths\":[],\"orders\":[\"ASC\"]},{\"$id\":\"_key_enabled_type\",\"type\":\"key\",\"attributes\":[\"enabled\",\"type\"],\"lengths\":[],\"orders\":[\"ASC\"]},{\"$id\":\"_key_search\",\"type\":\"fulltext\",\"attributes\":[\"search\"],\"lengths\":[],\"orders\":[]}]',1),
(24,'messages','2025-03-20 16:35:15.402','2025-03-20 16:35:15.402','[\"create(\\\"any\\\")\"]','messages','[{\"$id\":\"providerType\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"status\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":true,\"default\":\"processing\",\"array\":false,\"filters\":[]},{\"$id\":\"data\",\"type\":\"string\",\"format\":\"\",\"size\":65535,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[\"json\"]},{\"$id\":\"topics\",\"type\":\"string\",\"format\":\"\",\"size\":21845,\"signed\":true,\"required\":false,\"default\":[],\"array\":true,\"filters\":[]},{\"$id\":\"users\",\"type\":\"string\",\"format\":\"\",\"size\":21845,\"signed\":true,\"required\":false,\"default\":[],\"array\":true,\"filters\":[]},{\"$id\":\"targets\",\"type\":\"string\",\"format\":\"\",\"size\":21845,\"signed\":true,\"required\":false,\"default\":[],\"array\":true,\"filters\":[]},{\"$id\":\"scheduledAt\",\"type\":\"datetime\",\"format\":\"\",\"size\":0,\"signed\":false,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"datetime\"]},{\"$id\":\"scheduleInternalId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"scheduleId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"deliveredAt\",\"type\":\"datetime\",\"format\":\"\",\"size\":0,\"signed\":false,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"datetime\"]},{\"$id\":\"deliveryErrors\",\"type\":\"string\",\"format\":\"\",\"size\":65535,\"signed\":true,\"required\":false,\"default\":null,\"array\":true,\"filters\":[]},{\"$id\":\"deliveredTotal\",\"type\":\"integer\",\"format\":\"\",\"size\":0,\"signed\":true,\"required\":false,\"default\":0,\"array\":false,\"filters\":[]},{\"$id\":\"search\",\"type\":\"string\",\"format\":\"\",\"size\":16384,\"signed\":true,\"required\":false,\"default\":\"\",\"array\":false,\"filters\":[\"messageSearch\"]}]','[{\"$id\":\"_key_search\",\"type\":\"fulltext\",\"attributes\":[\"search\"],\"lengths\":[],\"orders\":[]}]',1),
(25,'topics','2025-03-20 16:35:15.558','2025-03-20 16:35:15.558','[\"create(\\\"any\\\")\"]','topics','[{\"$id\":\"name\",\"type\":\"string\",\"format\":\"\",\"size\":128,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"subscribe\",\"type\":\"string\",\"format\":\"\",\"size\":128,\"signed\":true,\"required\":false,\"default\":null,\"array\":true,\"filters\":[]},{\"$id\":\"emailTotal\",\"type\":\"integer\",\"format\":\"\",\"size\":0,\"signed\":true,\"required\":false,\"default\":0,\"array\":false,\"filters\":[]},{\"$id\":\"smsTotal\",\"type\":\"integer\",\"format\":\"\",\"size\":0,\"signed\":true,\"required\":false,\"default\":0,\"array\":false,\"filters\":[]},{\"$id\":\"pushTotal\",\"type\":\"integer\",\"format\":\"\",\"size\":0,\"signed\":true,\"required\":false,\"default\":0,\"array\":false,\"filters\":[]},{\"$id\":\"targets\",\"type\":\"string\",\"format\":\"\",\"size\":16384,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"subQueryTopicTargets\"]},{\"$id\":\"search\",\"type\":\"string\",\"format\":\"\",\"size\":16384,\"signed\":true,\"required\":false,\"default\":\"\",\"array\":false,\"filters\":[\"topicSearch\"]}]','[{\"$id\":\"_key_name\",\"type\":\"fulltext\",\"attributes\":[\"name\"],\"lengths\":[],\"orders\":[]},{\"$id\":\"_key_search\",\"type\":\"fulltext\",\"attributes\":[\"search\"],\"lengths\":[],\"orders\":[\"ASC\"]}]',1),
(26,'subscribers','2025-03-20 16:35:15.745','2025-03-20 16:35:15.745','[\"create(\\\"any\\\")\"]','subscribers','[{\"$id\":\"targetId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"targetInternalId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"userId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"userInternalId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"topicId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"topicInternalId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"providerType\",\"type\":\"string\",\"format\":\"\",\"size\":128,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"search\",\"type\":\"string\",\"format\":\"\",\"size\":16384,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]}]','[{\"$id\":\"_key_targetId\",\"type\":\"key\",\"attributes\":[\"targetId\"],\"lengths\":[],\"orders\":[]},{\"$id\":\"_key_targetInternalId\",\"type\":\"key\",\"attributes\":[\"targetInternalId\"],\"lengths\":[],\"orders\":[]},{\"$id\":\"_key_userId\",\"type\":\"key\",\"attributes\":[\"userId\"],\"lengths\":[],\"orders\":[]},{\"$id\":\"_key_userInternalId\",\"type\":\"key\",\"attributes\":[\"userInternalId\"],\"lengths\":[],\"orders\":[]},{\"$id\":\"_key_topicId\",\"type\":\"key\",\"attributes\":[\"topicId\"],\"lengths\":[],\"orders\":[]},{\"$id\":\"_key_topicInternalId\",\"type\":\"key\",\"attributes\":[\"topicInternalId\"],\"lengths\":[],\"orders\":[]},{\"$id\":\"_unique_target_topic\",\"type\":\"unique\",\"attributes\":[\"targetInternalId\",\"topicInternalId\"],\"lengths\":[],\"orders\":[]},{\"$id\":\"_fulltext_search\",\"type\":\"fulltext\",\"attributes\":[\"search\"],\"lengths\":[],\"orders\":[]}]',1),
(27,'targets','2025-03-20 16:35:15.896','2025-03-20 16:35:15.896','[\"create(\\\"any\\\")\"]','targets','[{\"$id\":\"userId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"userInternalId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"sessionId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"sessionInternalId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"providerType\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"providerId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"providerInternalId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"identifier\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"name\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"expired\",\"type\":\"boolean\",\"format\":\"\",\"size\":0,\"signed\":true,\"required\":false,\"default\":false,\"array\":false,\"filters\":[]}]','[{\"$id\":\"_key_userId\",\"type\":\"key\",\"attributes\":[\"userId\"],\"lengths\":[],\"orders\":[\"ASC\"]},{\"$id\":\"_key_userInternalId\",\"type\":\"key\",\"attributes\":[\"userInternalId\"],\"lengths\":[],\"orders\":[\"ASC\"]},{\"$id\":\"_key_providerId\",\"type\":\"key\",\"attributes\":[\"providerId\"],\"lengths\":[],\"orders\":[]},{\"$id\":\"_key_providerInternalId\",\"type\":\"key\",\"attributes\":[\"providerInternalId\"],\"lengths\":[],\"orders\":[]},{\"$id\":\"_key_identifier\",\"type\":\"unique\",\"attributes\":[\"identifier\"],\"lengths\":[],\"orders\":[]}]',1);
/*!40000 ALTER TABLE `_1__metadata` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_1__metadata_perms`
--

DROP TABLE IF EXISTS `_1__metadata_perms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_1__metadata_perms` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_type` varchar(12) NOT NULL,
  `_permission` varchar(255) NOT NULL,
  `_document` varchar(255) NOT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_index1` (`_document`,`_type`,`_permission`),
  KEY `_permission` (`_permission`,`_type`)
) ENGINE=InnoDB AUTO_INCREMENT=28 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_1__metadata_perms`
--

LOCK TABLES `_1__metadata_perms` WRITE;
/*!40000 ALTER TABLE `_1__metadata_perms` DISABLE KEYS */;
INSERT INTO `_1__metadata_perms` VALUES
(2,'create','any','abuse'),
(4,'create','any','attributes'),
(1,'create','any','audit'),
(15,'create','any','authenticators'),
(21,'create','any','buckets'),
(8,'create','any','builds'),
(12,'create','any','cache'),
(16,'create','any','challenges'),
(3,'create','any','databases'),
(7,'create','any','deployments'),
(9,'create','any','executions'),
(6,'create','any','functions'),
(18,'create','any','identities'),
(5,'create','any','indexes'),
(20,'create','any','memberships'),
(24,'create','any','messages'),
(11,'create','any','migrations'),
(23,'create','any','providers'),
(17,'create','any','sessions'),
(22,'create','any','stats'),
(26,'create','any','subscribers'),
(27,'create','any','targets'),
(19,'create','any','teams'),
(14,'create','any','tokens'),
(25,'create','any','topics'),
(13,'create','any','users'),
(10,'create','any','variables');
/*!40000 ALTER TABLE `_1__metadata_perms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_1_abuse`
--

DROP TABLE IF EXISTS `_1_abuse`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_1_abuse` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_uid` varchar(255) NOT NULL,
  `_createdAt` datetime(3) DEFAULT NULL,
  `_updatedAt` datetime(3) DEFAULT NULL,
  `_permissions` mediumtext DEFAULT NULL,
  `key` varchar(255) DEFAULT NULL,
  `time` datetime(3) DEFAULT NULL,
  `count` bigint(20) unsigned DEFAULT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_uid` (`_uid`),
  UNIQUE KEY `unique1` (`key`,`time`),
  KEY `index2` (`time`),
  KEY `_created_at` (`_createdAt`),
  KEY `_updated_at` (`_updatedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_1_abuse`
--

LOCK TABLES `_1_abuse` WRITE;
/*!40000 ALTER TABLE `_1_abuse` DISABLE KEYS */;
/*!40000 ALTER TABLE `_1_abuse` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_1_abuse_perms`
--

DROP TABLE IF EXISTS `_1_abuse_perms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_1_abuse_perms` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_type` varchar(12) NOT NULL,
  `_permission` varchar(255) NOT NULL,
  `_document` varchar(255) NOT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_index1` (`_document`,`_type`,`_permission`),
  KEY `_permission` (`_permission`,`_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_1_abuse_perms`
--

LOCK TABLES `_1_abuse_perms` WRITE;
/*!40000 ALTER TABLE `_1_abuse_perms` DISABLE KEYS */;
/*!40000 ALTER TABLE `_1_abuse_perms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_1_attributes`
--

DROP TABLE IF EXISTS `_1_attributes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_1_attributes` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_uid` varchar(255) NOT NULL,
  `_createdAt` datetime(3) DEFAULT NULL,
  `_updatedAt` datetime(3) DEFAULT NULL,
  `_permissions` mediumtext DEFAULT NULL,
  `databaseInternalId` varchar(255) DEFAULT NULL,
  `databaseId` varchar(255) DEFAULT NULL,
  `collectionInternalId` varchar(255) DEFAULT NULL,
  `collectionId` varchar(255) DEFAULT NULL,
  `key` varchar(255) DEFAULT NULL,
  `type` varchar(256) DEFAULT NULL,
  `status` varchar(16) DEFAULT NULL,
  `error` varchar(2048) DEFAULT NULL,
  `size` int(11) DEFAULT NULL,
  `required` tinyint(1) DEFAULT NULL,
  `default` text DEFAULT NULL,
  `signed` tinyint(1) DEFAULT NULL,
  `array` tinyint(1) DEFAULT NULL,
  `format` varchar(64) DEFAULT NULL,
  `formatOptions` text DEFAULT NULL,
  `filters` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`filters`)),
  `options` text DEFAULT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_uid` (`_uid`),
  KEY `_key_db_collection` (`databaseInternalId`,`collectionInternalId`),
  KEY `_created_at` (`_createdAt`),
  KEY `_updated_at` (`_updatedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_1_attributes`
--

LOCK TABLES `_1_attributes` WRITE;
/*!40000 ALTER TABLE `_1_attributes` DISABLE KEYS */;
/*!40000 ALTER TABLE `_1_attributes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_1_attributes_perms`
--

DROP TABLE IF EXISTS `_1_attributes_perms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_1_attributes_perms` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_type` varchar(12) NOT NULL,
  `_permission` varchar(255) NOT NULL,
  `_document` varchar(255) NOT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_index1` (`_document`,`_type`,`_permission`),
  KEY `_permission` (`_permission`,`_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_1_attributes_perms`
--

LOCK TABLES `_1_attributes_perms` WRITE;
/*!40000 ALTER TABLE `_1_attributes_perms` DISABLE KEYS */;
/*!40000 ALTER TABLE `_1_attributes_perms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_1_audit`
--

DROP TABLE IF EXISTS `_1_audit`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_1_audit` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_uid` varchar(255) NOT NULL,
  `_createdAt` datetime(3) DEFAULT NULL,
  `_updatedAt` datetime(3) DEFAULT NULL,
  `_permissions` mediumtext DEFAULT NULL,
  `userId` varchar(255) DEFAULT NULL,
  `event` varchar(255) DEFAULT NULL,
  `resource` varchar(255) DEFAULT NULL,
  `userAgent` text DEFAULT NULL,
  `ip` varchar(45) DEFAULT NULL,
  `location` varchar(45) DEFAULT NULL,
  `time` datetime(3) DEFAULT NULL,
  `data` longtext DEFAULT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_uid` (`_uid`),
  KEY `index2` (`event`),
  KEY `index4` (`userId`,`event`),
  KEY `index5` (`resource`,`event`),
  KEY `index-time` (`time` DESC),
  KEY `_created_at` (`_createdAt`),
  KEY `_updated_at` (`_updatedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_1_audit`
--

LOCK TABLES `_1_audit` WRITE;
/*!40000 ALTER TABLE `_1_audit` DISABLE KEYS */;
/*!40000 ALTER TABLE `_1_audit` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_1_audit_perms`
--

DROP TABLE IF EXISTS `_1_audit_perms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_1_audit_perms` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_type` varchar(12) NOT NULL,
  `_permission` varchar(255) NOT NULL,
  `_document` varchar(255) NOT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_index1` (`_document`,`_type`,`_permission`),
  KEY `_permission` (`_permission`,`_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_1_audit_perms`
--

LOCK TABLES `_1_audit_perms` WRITE;
/*!40000 ALTER TABLE `_1_audit_perms` DISABLE KEYS */;
/*!40000 ALTER TABLE `_1_audit_perms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_1_authenticators`
--

DROP TABLE IF EXISTS `_1_authenticators`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_1_authenticators` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_uid` varchar(255) NOT NULL,
  `_createdAt` datetime(3) DEFAULT NULL,
  `_updatedAt` datetime(3) DEFAULT NULL,
  `_permissions` mediumtext DEFAULT NULL,
  `userInternalId` varchar(255) DEFAULT NULL,
  `userId` varchar(255) DEFAULT NULL,
  `type` varchar(255) DEFAULT NULL,
  `verified` tinyint(1) DEFAULT NULL,
  `data` text DEFAULT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_uid` (`_uid`),
  KEY `_key_userInternalId` (`userInternalId`),
  KEY `_created_at` (`_createdAt`),
  KEY `_updated_at` (`_updatedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_1_authenticators`
--

LOCK TABLES `_1_authenticators` WRITE;
/*!40000 ALTER TABLE `_1_authenticators` DISABLE KEYS */;
/*!40000 ALTER TABLE `_1_authenticators` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_1_authenticators_perms`
--

DROP TABLE IF EXISTS `_1_authenticators_perms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_1_authenticators_perms` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_type` varchar(12) NOT NULL,
  `_permission` varchar(255) NOT NULL,
  `_document` varchar(255) NOT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_index1` (`_document`,`_type`,`_permission`),
  KEY `_permission` (`_permission`,`_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_1_authenticators_perms`
--

LOCK TABLES `_1_authenticators_perms` WRITE;
/*!40000 ALTER TABLE `_1_authenticators_perms` DISABLE KEYS */;
/*!40000 ALTER TABLE `_1_authenticators_perms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_1_buckets`
--

DROP TABLE IF EXISTS `_1_buckets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_1_buckets` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_uid` varchar(255) NOT NULL,
  `_createdAt` datetime(3) DEFAULT NULL,
  `_updatedAt` datetime(3) DEFAULT NULL,
  `_permissions` mediumtext DEFAULT NULL,
  `enabled` tinyint(1) DEFAULT NULL,
  `name` varchar(128) DEFAULT NULL,
  `fileSecurity` tinyint(1) DEFAULT NULL,
  `maximumFileSize` bigint(20) unsigned DEFAULT NULL,
  `allowedFileExtensions` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`allowedFileExtensions`)),
  `compression` varchar(10) DEFAULT NULL,
  `encryption` tinyint(1) DEFAULT NULL,
  `antivirus` tinyint(1) DEFAULT NULL,
  `search` text DEFAULT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_uid` (`_uid`),
  KEY `_key_enabled` (`enabled`),
  KEY `_key_name` (`name`),
  KEY `_key_fileSecurity` (`fileSecurity`),
  KEY `_key_maximumFileSize` (`maximumFileSize`),
  KEY `_key_encryption` (`encryption`),
  KEY `_key_antivirus` (`antivirus`),
  KEY `_created_at` (`_createdAt`),
  KEY `_updated_at` (`_updatedAt`),
  FULLTEXT KEY `_fulltext_name` (`name`),
  FULLTEXT KEY `_key_search` (`search`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_1_buckets`
--

LOCK TABLES `_1_buckets` WRITE;
/*!40000 ALTER TABLE `_1_buckets` DISABLE KEYS */;
/*!40000 ALTER TABLE `_1_buckets` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_1_buckets_perms`
--

DROP TABLE IF EXISTS `_1_buckets_perms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_1_buckets_perms` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_type` varchar(12) NOT NULL,
  `_permission` varchar(255) NOT NULL,
  `_document` varchar(255) NOT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_index1` (`_document`,`_type`,`_permission`),
  KEY `_permission` (`_permission`,`_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_1_buckets_perms`
--

LOCK TABLES `_1_buckets_perms` WRITE;
/*!40000 ALTER TABLE `_1_buckets_perms` DISABLE KEYS */;
/*!40000 ALTER TABLE `_1_buckets_perms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_1_builds`
--

DROP TABLE IF EXISTS `_1_builds`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_1_builds` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_uid` varchar(255) NOT NULL,
  `_createdAt` datetime(3) DEFAULT NULL,
  `_updatedAt` datetime(3) DEFAULT NULL,
  `_permissions` mediumtext DEFAULT NULL,
  `startTime` datetime(3) DEFAULT NULL,
  `endTime` datetime(3) DEFAULT NULL,
  `duration` int(11) DEFAULT NULL,
  `size` int(11) DEFAULT NULL,
  `deploymentInternalId` varchar(255) DEFAULT NULL,
  `deploymentId` varchar(255) DEFAULT NULL,
  `runtime` varchar(2048) DEFAULT NULL,
  `status` varchar(256) DEFAULT NULL,
  `path` varchar(2048) DEFAULT NULL,
  `logs` mediumtext DEFAULT NULL,
  `sourceType` varchar(2048) DEFAULT NULL,
  `source` varchar(2048) DEFAULT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_uid` (`_uid`),
  KEY `_key_deployment` (`deploymentId`),
  KEY `_created_at` (`_createdAt`),
  KEY `_updated_at` (`_updatedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_1_builds`
--

LOCK TABLES `_1_builds` WRITE;
/*!40000 ALTER TABLE `_1_builds` DISABLE KEYS */;
/*!40000 ALTER TABLE `_1_builds` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_1_builds_perms`
--

DROP TABLE IF EXISTS `_1_builds_perms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_1_builds_perms` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_type` varchar(12) NOT NULL,
  `_permission` varchar(255) NOT NULL,
  `_document` varchar(255) NOT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_index1` (`_document`,`_type`,`_permission`),
  KEY `_permission` (`_permission`,`_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_1_builds_perms`
--

LOCK TABLES `_1_builds_perms` WRITE;
/*!40000 ALTER TABLE `_1_builds_perms` DISABLE KEYS */;
/*!40000 ALTER TABLE `_1_builds_perms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_1_cache`
--

DROP TABLE IF EXISTS `_1_cache`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_1_cache` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_uid` varchar(255) NOT NULL,
  `_createdAt` datetime(3) DEFAULT NULL,
  `_updatedAt` datetime(3) DEFAULT NULL,
  `_permissions` mediumtext DEFAULT NULL,
  `resource` varchar(255) DEFAULT NULL,
  `resourceType` varchar(255) DEFAULT NULL,
  `mimeType` varchar(255) DEFAULT NULL,
  `accessedAt` datetime(3) DEFAULT NULL,
  `signature` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_uid` (`_uid`),
  KEY `_key_accessedAt` (`accessedAt`),
  KEY `_key_resource` (`resource`),
  KEY `_created_at` (`_createdAt`),
  KEY `_updated_at` (`_updatedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_1_cache`
--

LOCK TABLES `_1_cache` WRITE;
/*!40000 ALTER TABLE `_1_cache` DISABLE KEYS */;
/*!40000 ALTER TABLE `_1_cache` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_1_cache_perms`
--

DROP TABLE IF EXISTS `_1_cache_perms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_1_cache_perms` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_type` varchar(12) NOT NULL,
  `_permission` varchar(255) NOT NULL,
  `_document` varchar(255) NOT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_index1` (`_document`,`_type`,`_permission`),
  KEY `_permission` (`_permission`,`_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_1_cache_perms`
--

LOCK TABLES `_1_cache_perms` WRITE;
/*!40000 ALTER TABLE `_1_cache_perms` DISABLE KEYS */;
/*!40000 ALTER TABLE `_1_cache_perms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_1_challenges`
--

DROP TABLE IF EXISTS `_1_challenges`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_1_challenges` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_uid` varchar(255) NOT NULL,
  `_createdAt` datetime(3) DEFAULT NULL,
  `_updatedAt` datetime(3) DEFAULT NULL,
  `_permissions` mediumtext DEFAULT NULL,
  `userInternalId` varchar(255) DEFAULT NULL,
  `userId` varchar(255) DEFAULT NULL,
  `type` varchar(255) DEFAULT NULL,
  `token` varchar(512) DEFAULT NULL,
  `code` varchar(512) DEFAULT NULL,
  `expire` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_uid` (`_uid`),
  KEY `_key_user` (`userInternalId`),
  KEY `_created_at` (`_createdAt`),
  KEY `_updated_at` (`_updatedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_1_challenges`
--

LOCK TABLES `_1_challenges` WRITE;
/*!40000 ALTER TABLE `_1_challenges` DISABLE KEYS */;
/*!40000 ALTER TABLE `_1_challenges` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_1_challenges_perms`
--

DROP TABLE IF EXISTS `_1_challenges_perms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_1_challenges_perms` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_type` varchar(12) NOT NULL,
  `_permission` varchar(255) NOT NULL,
  `_document` varchar(255) NOT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_index1` (`_document`,`_type`,`_permission`),
  KEY `_permission` (`_permission`,`_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_1_challenges_perms`
--

LOCK TABLES `_1_challenges_perms` WRITE;
/*!40000 ALTER TABLE `_1_challenges_perms` DISABLE KEYS */;
/*!40000 ALTER TABLE `_1_challenges_perms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_1_databases`
--

DROP TABLE IF EXISTS `_1_databases`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_1_databases` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_uid` varchar(255) NOT NULL,
  `_createdAt` datetime(3) DEFAULT NULL,
  `_updatedAt` datetime(3) DEFAULT NULL,
  `_permissions` mediumtext DEFAULT NULL,
  `name` varchar(256) DEFAULT NULL,
  `enabled` tinyint(1) DEFAULT NULL,
  `search` text DEFAULT NULL,
  `originalId` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_uid` (`_uid`),
  KEY `_key_name` (`name`),
  KEY `_created_at` (`_createdAt`),
  KEY `_updated_at` (`_updatedAt`),
  FULLTEXT KEY `_fulltext_search` (`search`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_1_databases`
--

LOCK TABLES `_1_databases` WRITE;
/*!40000 ALTER TABLE `_1_databases` DISABLE KEYS */;
/*!40000 ALTER TABLE `_1_databases` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_1_databases_perms`
--

DROP TABLE IF EXISTS `_1_databases_perms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_1_databases_perms` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_type` varchar(12) NOT NULL,
  `_permission` varchar(255) NOT NULL,
  `_document` varchar(255) NOT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_index1` (`_document`,`_type`,`_permission`),
  KEY `_permission` (`_permission`,`_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_1_databases_perms`
--

LOCK TABLES `_1_databases_perms` WRITE;
/*!40000 ALTER TABLE `_1_databases_perms` DISABLE KEYS */;
/*!40000 ALTER TABLE `_1_databases_perms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_1_deployments`
--

DROP TABLE IF EXISTS `_1_deployments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_1_deployments` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_uid` varchar(255) NOT NULL,
  `_createdAt` datetime(3) DEFAULT NULL,
  `_updatedAt` datetime(3) DEFAULT NULL,
  `_permissions` mediumtext DEFAULT NULL,
  `resourceInternalId` varchar(255) DEFAULT NULL,
  `resourceId` varchar(255) DEFAULT NULL,
  `resourceType` varchar(255) DEFAULT NULL,
  `buildInternalId` varchar(255) DEFAULT NULL,
  `buildId` varchar(255) DEFAULT NULL,
  `entrypoint` varchar(2048) DEFAULT NULL,
  `commands` varchar(2048) DEFAULT NULL,
  `path` varchar(2048) DEFAULT NULL,
  `type` varchar(2048) DEFAULT NULL,
  `installationId` varchar(255) DEFAULT NULL,
  `installationInternalId` varchar(255) DEFAULT NULL,
  `providerRepositoryId` varchar(255) DEFAULT NULL,
  `repositoryId` varchar(255) DEFAULT NULL,
  `repositoryInternalId` varchar(255) DEFAULT NULL,
  `providerRepositoryName` varchar(255) DEFAULT NULL,
  `providerRepositoryOwner` varchar(255) DEFAULT NULL,
  `providerRepositoryUrl` varchar(255) DEFAULT NULL,
  `providerCommitHash` varchar(255) DEFAULT NULL,
  `providerCommitAuthorUrl` varchar(255) DEFAULT NULL,
  `providerCommitAuthor` varchar(255) DEFAULT NULL,
  `providerCommitMessage` varchar(255) DEFAULT NULL,
  `providerCommitUrl` varchar(255) DEFAULT NULL,
  `providerBranch` varchar(255) DEFAULT NULL,
  `providerBranchUrl` varchar(255) DEFAULT NULL,
  `providerRootDirectory` varchar(255) DEFAULT NULL,
  `providerCommentId` varchar(2048) DEFAULT NULL,
  `size` int(11) DEFAULT NULL,
  `metadata` text DEFAULT NULL,
  `chunksTotal` int(10) unsigned DEFAULT NULL,
  `chunksUploaded` int(10) unsigned DEFAULT NULL,
  `search` text DEFAULT NULL,
  `activate` tinyint(1) DEFAULT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_uid` (`_uid`),
  KEY `_key_resource` (`resourceId`),
  KEY `_key_resource_type` (`resourceType`),
  KEY `_key_size` (`size`),
  KEY `_key_buildId` (`buildId`),
  KEY `_key_activate` (`activate`),
  KEY `_created_at` (`_createdAt`),
  KEY `_updated_at` (`_updatedAt`),
  FULLTEXT KEY `_key_search` (`search`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_1_deployments`
--

LOCK TABLES `_1_deployments` WRITE;
/*!40000 ALTER TABLE `_1_deployments` DISABLE KEYS */;
/*!40000 ALTER TABLE `_1_deployments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_1_deployments_perms`
--

DROP TABLE IF EXISTS `_1_deployments_perms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_1_deployments_perms` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_type` varchar(12) NOT NULL,
  `_permission` varchar(255) NOT NULL,
  `_document` varchar(255) NOT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_index1` (`_document`,`_type`,`_permission`),
  KEY `_permission` (`_permission`,`_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_1_deployments_perms`
--

LOCK TABLES `_1_deployments_perms` WRITE;
/*!40000 ALTER TABLE `_1_deployments_perms` DISABLE KEYS */;
/*!40000 ALTER TABLE `_1_deployments_perms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_1_executions`
--

DROP TABLE IF EXISTS `_1_executions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_1_executions` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_uid` varchar(255) NOT NULL,
  `_createdAt` datetime(3) DEFAULT NULL,
  `_updatedAt` datetime(3) DEFAULT NULL,
  `_permissions` mediumtext DEFAULT NULL,
  `functionInternalId` varchar(255) DEFAULT NULL,
  `functionId` varchar(255) DEFAULT NULL,
  `deploymentInternalId` varchar(255) DEFAULT NULL,
  `deploymentId` varchar(255) DEFAULT NULL,
  `trigger` varchar(128) DEFAULT NULL,
  `status` varchar(128) DEFAULT NULL,
  `duration` double DEFAULT NULL,
  `errors` mediumtext DEFAULT NULL,
  `logs` mediumtext DEFAULT NULL,
  `requestMethod` varchar(128) DEFAULT NULL,
  `requestPath` varchar(2048) DEFAULT NULL,
  `requestHeaders` text DEFAULT NULL,
  `responseStatusCode` int(11) DEFAULT NULL,
  `responseHeaders` text DEFAULT NULL,
  `search` text DEFAULT NULL,
  `scheduledAt` datetime(3) DEFAULT NULL,
  `scheduleInternalId` varchar(255) DEFAULT NULL,
  `scheduleId` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_uid` (`_uid`),
  KEY `_key_function` (`functionId`),
  KEY `_key_trigger` (`trigger`(32)),
  KEY `_key_status` (`status`(32)),
  KEY `_key_requestMethod` (`requestMethod`),
  KEY `_key_requestPath` (`requestPath`(255)),
  KEY `_key_deployment` (`deploymentId`),
  KEY `_key_responseStatusCode` (`responseStatusCode`),
  KEY `_key_duration` (`duration`),
  KEY `_created_at` (`_createdAt`),
  KEY `_updated_at` (`_updatedAt`),
  FULLTEXT KEY `_fulltext_search` (`search`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_1_executions`
--

LOCK TABLES `_1_executions` WRITE;
/*!40000 ALTER TABLE `_1_executions` DISABLE KEYS */;
/*!40000 ALTER TABLE `_1_executions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_1_executions_perms`
--

DROP TABLE IF EXISTS `_1_executions_perms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_1_executions_perms` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_type` varchar(12) NOT NULL,
  `_permission` varchar(255) NOT NULL,
  `_document` varchar(255) NOT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_index1` (`_document`,`_type`,`_permission`),
  KEY `_permission` (`_permission`,`_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_1_executions_perms`
--

LOCK TABLES `_1_executions_perms` WRITE;
/*!40000 ALTER TABLE `_1_executions_perms` DISABLE KEYS */;
/*!40000 ALTER TABLE `_1_executions_perms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_1_functions`
--

DROP TABLE IF EXISTS `_1_functions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_1_functions` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_uid` varchar(255) NOT NULL,
  `_createdAt` datetime(3) DEFAULT NULL,
  `_updatedAt` datetime(3) DEFAULT NULL,
  `_permissions` mediumtext DEFAULT NULL,
  `execute` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`execute`)),
  `name` varchar(2048) DEFAULT NULL,
  `enabled` tinyint(1) DEFAULT NULL,
  `live` tinyint(1) DEFAULT NULL,
  `installationId` varchar(255) DEFAULT NULL,
  `installationInternalId` varchar(255) DEFAULT NULL,
  `providerRepositoryId` varchar(255) DEFAULT NULL,
  `repositoryId` varchar(255) DEFAULT NULL,
  `repositoryInternalId` varchar(255) DEFAULT NULL,
  `providerBranch` varchar(255) DEFAULT NULL,
  `providerRootDirectory` varchar(255) DEFAULT NULL,
  `providerSilentMode` tinyint(1) DEFAULT NULL,
  `logging` tinyint(1) DEFAULT NULL,
  `runtime` varchar(2048) DEFAULT NULL,
  `deploymentInternalId` varchar(255) DEFAULT NULL,
  `deployment` varchar(255) DEFAULT NULL,
  `vars` text DEFAULT NULL,
  `varsProject` text DEFAULT NULL,
  `events` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`events`)),
  `scheduleInternalId` varchar(255) DEFAULT NULL,
  `scheduleId` varchar(255) DEFAULT NULL,
  `schedule` varchar(128) DEFAULT NULL,
  `timeout` int(11) DEFAULT NULL,
  `search` text DEFAULT NULL,
  `version` varchar(8) DEFAULT NULL,
  `entrypoint` text DEFAULT NULL,
  `commands` text DEFAULT NULL,
  `specification` varchar(128) DEFAULT NULL,
  `scopes` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`scopes`)),
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_uid` (`_uid`),
  KEY `_key_name` (`name`(256)),
  KEY `_key_enabled` (`enabled`),
  KEY `_key_installationId` (`installationId`),
  KEY `_key_installationInternalId` (`installationInternalId`),
  KEY `_key_providerRepositoryId` (`providerRepositoryId`),
  KEY `_key_repositoryId` (`repositoryId`),
  KEY `_key_repositoryInternalId` (`repositoryInternalId`),
  KEY `_key_runtime` (`runtime`(64)),
  KEY `_key_deployment` (`deployment`),
  KEY `_created_at` (`_createdAt`),
  KEY `_updated_at` (`_updatedAt`),
  FULLTEXT KEY `_key_search` (`search`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_1_functions`
--

LOCK TABLES `_1_functions` WRITE;
/*!40000 ALTER TABLE `_1_functions` DISABLE KEYS */;
/*!40000 ALTER TABLE `_1_functions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_1_functions_perms`
--

DROP TABLE IF EXISTS `_1_functions_perms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_1_functions_perms` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_type` varchar(12) NOT NULL,
  `_permission` varchar(255) NOT NULL,
  `_document` varchar(255) NOT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_index1` (`_document`,`_type`,`_permission`),
  KEY `_permission` (`_permission`,`_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_1_functions_perms`
--

LOCK TABLES `_1_functions_perms` WRITE;
/*!40000 ALTER TABLE `_1_functions_perms` DISABLE KEYS */;
/*!40000 ALTER TABLE `_1_functions_perms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_1_identities`
--

DROP TABLE IF EXISTS `_1_identities`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_1_identities` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_uid` varchar(255) NOT NULL,
  `_createdAt` datetime(3) DEFAULT NULL,
  `_updatedAt` datetime(3) DEFAULT NULL,
  `_permissions` mediumtext DEFAULT NULL,
  `userInternalId` varchar(255) DEFAULT NULL,
  `userId` varchar(255) DEFAULT NULL,
  `provider` varchar(128) DEFAULT NULL,
  `providerUid` varchar(2048) DEFAULT NULL,
  `providerEmail` varchar(320) DEFAULT NULL,
  `providerAccessToken` text DEFAULT NULL,
  `providerAccessTokenExpiry` datetime(3) DEFAULT NULL,
  `providerRefreshToken` text DEFAULT NULL,
  `secrets` text DEFAULT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_uid` (`_uid`),
  UNIQUE KEY `_key_userInternalId_provider_providerUid` (`userInternalId`(11),`provider`,`providerUid`(128)),
  UNIQUE KEY `_key_provider_providerUid` (`provider`,`providerUid`(128)),
  KEY `_key_userId` (`userId`),
  KEY `_key_userInternalId` (`userInternalId`),
  KEY `_key_provider` (`provider`),
  KEY `_key_providerUid` (`providerUid`(255)),
  KEY `_key_providerEmail` (`providerEmail`(255)),
  KEY `_key_providerAccessTokenExpiry` (`providerAccessTokenExpiry`),
  KEY `_created_at` (`_createdAt`),
  KEY `_updated_at` (`_updatedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_1_identities`
--

LOCK TABLES `_1_identities` WRITE;
/*!40000 ALTER TABLE `_1_identities` DISABLE KEYS */;
/*!40000 ALTER TABLE `_1_identities` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_1_identities_perms`
--

DROP TABLE IF EXISTS `_1_identities_perms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_1_identities_perms` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_type` varchar(12) NOT NULL,
  `_permission` varchar(255) NOT NULL,
  `_document` varchar(255) NOT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_index1` (`_document`,`_type`,`_permission`),
  KEY `_permission` (`_permission`,`_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_1_identities_perms`
--

LOCK TABLES `_1_identities_perms` WRITE;
/*!40000 ALTER TABLE `_1_identities_perms` DISABLE KEYS */;
/*!40000 ALTER TABLE `_1_identities_perms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_1_indexes`
--

DROP TABLE IF EXISTS `_1_indexes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_1_indexes` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_uid` varchar(255) NOT NULL,
  `_createdAt` datetime(3) DEFAULT NULL,
  `_updatedAt` datetime(3) DEFAULT NULL,
  `_permissions` mediumtext DEFAULT NULL,
  `databaseInternalId` varchar(255) DEFAULT NULL,
  `databaseId` varchar(255) DEFAULT NULL,
  `collectionInternalId` varchar(255) DEFAULT NULL,
  `collectionId` varchar(255) DEFAULT NULL,
  `key` varchar(255) DEFAULT NULL,
  `type` varchar(16) DEFAULT NULL,
  `status` varchar(16) DEFAULT NULL,
  `error` varchar(2048) DEFAULT NULL,
  `attributes` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`attributes`)),
  `lengths` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`lengths`)),
  `orders` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`orders`)),
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_uid` (`_uid`),
  KEY `_key_db_collection` (`databaseInternalId`,`collectionInternalId`),
  KEY `_created_at` (`_createdAt`),
  KEY `_updated_at` (`_updatedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_1_indexes`
--

LOCK TABLES `_1_indexes` WRITE;
/*!40000 ALTER TABLE `_1_indexes` DISABLE KEYS */;
/*!40000 ALTER TABLE `_1_indexes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_1_indexes_perms`
--

DROP TABLE IF EXISTS `_1_indexes_perms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_1_indexes_perms` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_type` varchar(12) NOT NULL,
  `_permission` varchar(255) NOT NULL,
  `_document` varchar(255) NOT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_index1` (`_document`,`_type`,`_permission`),
  KEY `_permission` (`_permission`,`_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_1_indexes_perms`
--

LOCK TABLES `_1_indexes_perms` WRITE;
/*!40000 ALTER TABLE `_1_indexes_perms` DISABLE KEYS */;
/*!40000 ALTER TABLE `_1_indexes_perms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_1_memberships`
--

DROP TABLE IF EXISTS `_1_memberships`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_1_memberships` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_uid` varchar(255) NOT NULL,
  `_createdAt` datetime(3) DEFAULT NULL,
  `_updatedAt` datetime(3) DEFAULT NULL,
  `_permissions` mediumtext DEFAULT NULL,
  `userInternalId` varchar(255) DEFAULT NULL,
  `userId` varchar(255) DEFAULT NULL,
  `teamInternalId` varchar(255) DEFAULT NULL,
  `teamId` varchar(255) DEFAULT NULL,
  `roles` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`roles`)),
  `invited` datetime(3) DEFAULT NULL,
  `joined` datetime(3) DEFAULT NULL,
  `confirm` tinyint(1) DEFAULT NULL,
  `secret` varchar(256) DEFAULT NULL,
  `search` text DEFAULT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_uid` (`_uid`),
  UNIQUE KEY `_key_unique` (`teamInternalId`,`userInternalId`),
  KEY `_key_user` (`userInternalId`),
  KEY `_key_team` (`teamInternalId`),
  KEY `_key_userId` (`userId`),
  KEY `_key_teamId` (`teamId`),
  KEY `_key_invited` (`invited`),
  KEY `_key_joined` (`joined`),
  KEY `_key_confirm` (`confirm`),
  KEY `_created_at` (`_createdAt`),
  KEY `_updated_at` (`_updatedAt`),
  FULLTEXT KEY `_key_search` (`search`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_1_memberships`
--

LOCK TABLES `_1_memberships` WRITE;
/*!40000 ALTER TABLE `_1_memberships` DISABLE KEYS */;
/*!40000 ALTER TABLE `_1_memberships` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_1_memberships_perms`
--

DROP TABLE IF EXISTS `_1_memberships_perms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_1_memberships_perms` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_type` varchar(12) NOT NULL,
  `_permission` varchar(255) NOT NULL,
  `_document` varchar(255) NOT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_index1` (`_document`,`_type`,`_permission`),
  KEY `_permission` (`_permission`,`_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_1_memberships_perms`
--

LOCK TABLES `_1_memberships_perms` WRITE;
/*!40000 ALTER TABLE `_1_memberships_perms` DISABLE KEYS */;
/*!40000 ALTER TABLE `_1_memberships_perms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_1_messages`
--

DROP TABLE IF EXISTS `_1_messages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_1_messages` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_uid` varchar(255) NOT NULL,
  `_createdAt` datetime(3) DEFAULT NULL,
  `_updatedAt` datetime(3) DEFAULT NULL,
  `_permissions` mediumtext DEFAULT NULL,
  `providerType` varchar(255) DEFAULT NULL,
  `status` varchar(255) DEFAULT NULL,
  `data` text DEFAULT NULL,
  `topics` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`topics`)),
  `users` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`users`)),
  `targets` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`targets`)),
  `scheduledAt` datetime(3) DEFAULT NULL,
  `scheduleInternalId` varchar(255) DEFAULT NULL,
  `scheduleId` varchar(255) DEFAULT NULL,
  `deliveredAt` datetime(3) DEFAULT NULL,
  `deliveryErrors` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`deliveryErrors`)),
  `deliveredTotal` int(11) DEFAULT NULL,
  `search` text DEFAULT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_uid` (`_uid`),
  KEY `_created_at` (`_createdAt`),
  KEY `_updated_at` (`_updatedAt`),
  FULLTEXT KEY `_key_search` (`search`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_1_messages`
--

LOCK TABLES `_1_messages` WRITE;
/*!40000 ALTER TABLE `_1_messages` DISABLE KEYS */;
/*!40000 ALTER TABLE `_1_messages` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_1_messages_perms`
--

DROP TABLE IF EXISTS `_1_messages_perms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_1_messages_perms` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_type` varchar(12) NOT NULL,
  `_permission` varchar(255) NOT NULL,
  `_document` varchar(255) NOT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_index1` (`_document`,`_type`,`_permission`),
  KEY `_permission` (`_permission`,`_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_1_messages_perms`
--

LOCK TABLES `_1_messages_perms` WRITE;
/*!40000 ALTER TABLE `_1_messages_perms` DISABLE KEYS */;
/*!40000 ALTER TABLE `_1_messages_perms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_1_migrations`
--

DROP TABLE IF EXISTS `_1_migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_1_migrations` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_uid` varchar(255) NOT NULL,
  `_createdAt` datetime(3) DEFAULT NULL,
  `_updatedAt` datetime(3) DEFAULT NULL,
  `_permissions` mediumtext DEFAULT NULL,
  `status` varchar(255) DEFAULT NULL,
  `stage` varchar(255) DEFAULT NULL,
  `source` varchar(8192) DEFAULT NULL,
  `destination` varchar(255) DEFAULT NULL,
  `credentials` mediumtext DEFAULT NULL,
  `resources` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`resources`)),
  `statusCounters` varchar(3000) DEFAULT NULL,
  `resourceData` mediumtext DEFAULT NULL,
  `errors` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`errors`)),
  `search` text DEFAULT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_uid` (`_uid`),
  KEY `_key_status` (`status`),
  KEY `_key_stage` (`stage`),
  KEY `_key_source` (`source`(255)),
  KEY `_created_at` (`_createdAt`),
  KEY `_updated_at` (`_updatedAt`),
  FULLTEXT KEY `_fulltext_search` (`search`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_1_migrations`
--

LOCK TABLES `_1_migrations` WRITE;
/*!40000 ALTER TABLE `_1_migrations` DISABLE KEYS */;
/*!40000 ALTER TABLE `_1_migrations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_1_migrations_perms`
--

DROP TABLE IF EXISTS `_1_migrations_perms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_1_migrations_perms` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_type` varchar(12) NOT NULL,
  `_permission` varchar(255) NOT NULL,
  `_document` varchar(255) NOT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_index1` (`_document`,`_type`,`_permission`),
  KEY `_permission` (`_permission`,`_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_1_migrations_perms`
--

LOCK TABLES `_1_migrations_perms` WRITE;
/*!40000 ALTER TABLE `_1_migrations_perms` DISABLE KEYS */;
/*!40000 ALTER TABLE `_1_migrations_perms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_1_providers`
--

DROP TABLE IF EXISTS `_1_providers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_1_providers` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_uid` varchar(255) NOT NULL,
  `_createdAt` datetime(3) DEFAULT NULL,
  `_updatedAt` datetime(3) DEFAULT NULL,
  `_permissions` mediumtext DEFAULT NULL,
  `name` varchar(128) DEFAULT NULL,
  `provider` varchar(255) DEFAULT NULL,
  `type` varchar(128) DEFAULT NULL,
  `enabled` tinyint(1) DEFAULT NULL,
  `credentials` text DEFAULT NULL,
  `options` text DEFAULT NULL,
  `search` text DEFAULT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_uid` (`_uid`),
  KEY `_key_provider` (`provider`),
  KEY `_key_type` (`type`),
  KEY `_key_enabled_type` (`enabled`,`type`),
  KEY `_created_at` (`_createdAt`),
  KEY `_updated_at` (`_updatedAt`),
  FULLTEXT KEY `_key_name` (`name`),
  FULLTEXT KEY `_key_search` (`search`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_1_providers`
--

LOCK TABLES `_1_providers` WRITE;
/*!40000 ALTER TABLE `_1_providers` DISABLE KEYS */;
/*!40000 ALTER TABLE `_1_providers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_1_providers_perms`
--

DROP TABLE IF EXISTS `_1_providers_perms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_1_providers_perms` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_type` varchar(12) NOT NULL,
  `_permission` varchar(255) NOT NULL,
  `_document` varchar(255) NOT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_index1` (`_document`,`_type`,`_permission`),
  KEY `_permission` (`_permission`,`_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_1_providers_perms`
--

LOCK TABLES `_1_providers_perms` WRITE;
/*!40000 ALTER TABLE `_1_providers_perms` DISABLE KEYS */;
/*!40000 ALTER TABLE `_1_providers_perms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_1_sessions`
--

DROP TABLE IF EXISTS `_1_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_1_sessions` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_uid` varchar(255) NOT NULL,
  `_createdAt` datetime(3) DEFAULT NULL,
  `_updatedAt` datetime(3) DEFAULT NULL,
  `_permissions` mediumtext DEFAULT NULL,
  `userInternalId` varchar(255) DEFAULT NULL,
  `userId` varchar(255) DEFAULT NULL,
  `provider` varchar(128) DEFAULT NULL,
  `providerUid` varchar(2048) DEFAULT NULL,
  `providerAccessToken` text DEFAULT NULL,
  `providerAccessTokenExpiry` datetime(3) DEFAULT NULL,
  `providerRefreshToken` text DEFAULT NULL,
  `secret` varchar(512) DEFAULT NULL,
  `userAgent` text DEFAULT NULL,
  `ip` varchar(45) DEFAULT NULL,
  `countryCode` varchar(2) DEFAULT NULL,
  `osCode` varchar(256) DEFAULT NULL,
  `osName` varchar(256) DEFAULT NULL,
  `osVersion` varchar(256) DEFAULT NULL,
  `clientType` varchar(256) DEFAULT NULL,
  `clientCode` varchar(256) DEFAULT NULL,
  `clientName` varchar(256) DEFAULT NULL,
  `clientVersion` varchar(256) DEFAULT NULL,
  `clientEngine` varchar(256) DEFAULT NULL,
  `clientEngineVersion` varchar(256) DEFAULT NULL,
  `deviceName` varchar(256) DEFAULT NULL,
  `deviceBrand` varchar(256) DEFAULT NULL,
  `deviceModel` varchar(256) DEFAULT NULL,
  `factors` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`factors`)),
  `expire` datetime(3) DEFAULT NULL,
  `mfaUpdatedAt` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_uid` (`_uid`),
  KEY `_key_provider_providerUid` (`provider`,`providerUid`(128)),
  KEY `_key_user` (`userInternalId`),
  KEY `_created_at` (`_createdAt`),
  KEY `_updated_at` (`_updatedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_1_sessions`
--

LOCK TABLES `_1_sessions` WRITE;
/*!40000 ALTER TABLE `_1_sessions` DISABLE KEYS */;
/*!40000 ALTER TABLE `_1_sessions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_1_sessions_perms`
--

DROP TABLE IF EXISTS `_1_sessions_perms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_1_sessions_perms` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_type` varchar(12) NOT NULL,
  `_permission` varchar(255) NOT NULL,
  `_document` varchar(255) NOT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_index1` (`_document`,`_type`,`_permission`),
  KEY `_permission` (`_permission`,`_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_1_sessions_perms`
--

LOCK TABLES `_1_sessions_perms` WRITE;
/*!40000 ALTER TABLE `_1_sessions_perms` DISABLE KEYS */;
/*!40000 ALTER TABLE `_1_sessions_perms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_1_stats`
--

DROP TABLE IF EXISTS `_1_stats`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_1_stats` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_uid` varchar(255) NOT NULL,
  `_createdAt` datetime(3) DEFAULT NULL,
  `_updatedAt` datetime(3) DEFAULT NULL,
  `_permissions` mediumtext DEFAULT NULL,
  `metric` varchar(255) DEFAULT NULL,
  `region` varchar(255) DEFAULT NULL,
  `value` bigint(20) DEFAULT NULL,
  `time` datetime(3) DEFAULT NULL,
  `period` varchar(4) DEFAULT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_uid` (`_uid`),
  UNIQUE KEY `_key_metric_period_time` (`metric` DESC,`period`,`time`),
  KEY `_key_time` (`time` DESC),
  KEY `_key_period_time` (`period`,`time`),
  KEY `_created_at` (`_createdAt`),
  KEY `_updated_at` (`_updatedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_1_stats`
--

LOCK TABLES `_1_stats` WRITE;
/*!40000 ALTER TABLE `_1_stats` DISABLE KEYS */;
/*!40000 ALTER TABLE `_1_stats` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_1_stats_perms`
--

DROP TABLE IF EXISTS `_1_stats_perms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_1_stats_perms` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_type` varchar(12) NOT NULL,
  `_permission` varchar(255) NOT NULL,
  `_document` varchar(255) NOT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_index1` (`_document`,`_type`,`_permission`),
  KEY `_permission` (`_permission`,`_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_1_stats_perms`
--

LOCK TABLES `_1_stats_perms` WRITE;
/*!40000 ALTER TABLE `_1_stats_perms` DISABLE KEYS */;
/*!40000 ALTER TABLE `_1_stats_perms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_1_subscribers`
--

DROP TABLE IF EXISTS `_1_subscribers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_1_subscribers` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_uid` varchar(255) NOT NULL,
  `_createdAt` datetime(3) DEFAULT NULL,
  `_updatedAt` datetime(3) DEFAULT NULL,
  `_permissions` mediumtext DEFAULT NULL,
  `targetId` varchar(255) DEFAULT NULL,
  `targetInternalId` varchar(255) DEFAULT NULL,
  `userId` varchar(255) DEFAULT NULL,
  `userInternalId` varchar(255) DEFAULT NULL,
  `topicId` varchar(255) DEFAULT NULL,
  `topicInternalId` varchar(255) DEFAULT NULL,
  `providerType` varchar(128) DEFAULT NULL,
  `search` text DEFAULT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_uid` (`_uid`),
  UNIQUE KEY `_unique_target_topic` (`targetInternalId`,`topicInternalId`),
  KEY `_key_targetId` (`targetId`),
  KEY `_key_targetInternalId` (`targetInternalId`),
  KEY `_key_userId` (`userId`),
  KEY `_key_userInternalId` (`userInternalId`),
  KEY `_key_topicId` (`topicId`),
  KEY `_key_topicInternalId` (`topicInternalId`),
  KEY `_created_at` (`_createdAt`),
  KEY `_updated_at` (`_updatedAt`),
  FULLTEXT KEY `_fulltext_search` (`search`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_1_subscribers`
--

LOCK TABLES `_1_subscribers` WRITE;
/*!40000 ALTER TABLE `_1_subscribers` DISABLE KEYS */;
/*!40000 ALTER TABLE `_1_subscribers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_1_subscribers_perms`
--

DROP TABLE IF EXISTS `_1_subscribers_perms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_1_subscribers_perms` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_type` varchar(12) NOT NULL,
  `_permission` varchar(255) NOT NULL,
  `_document` varchar(255) NOT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_index1` (`_document`,`_type`,`_permission`),
  KEY `_permission` (`_permission`,`_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_1_subscribers_perms`
--

LOCK TABLES `_1_subscribers_perms` WRITE;
/*!40000 ALTER TABLE `_1_subscribers_perms` DISABLE KEYS */;
/*!40000 ALTER TABLE `_1_subscribers_perms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_1_targets`
--

DROP TABLE IF EXISTS `_1_targets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_1_targets` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_uid` varchar(255) NOT NULL,
  `_createdAt` datetime(3) DEFAULT NULL,
  `_updatedAt` datetime(3) DEFAULT NULL,
  `_permissions` mediumtext DEFAULT NULL,
  `userId` varchar(255) DEFAULT NULL,
  `userInternalId` varchar(255) DEFAULT NULL,
  `sessionId` varchar(255) DEFAULT NULL,
  `sessionInternalId` varchar(255) DEFAULT NULL,
  `providerType` varchar(255) DEFAULT NULL,
  `providerId` varchar(255) DEFAULT NULL,
  `providerInternalId` varchar(255) DEFAULT NULL,
  `identifier` varchar(255) DEFAULT NULL,
  `name` varchar(255) DEFAULT NULL,
  `expired` tinyint(1) DEFAULT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_uid` (`_uid`),
  UNIQUE KEY `_key_identifier` (`identifier`),
  KEY `_key_userId` (`userId`),
  KEY `_key_userInternalId` (`userInternalId`),
  KEY `_key_providerId` (`providerId`),
  KEY `_key_providerInternalId` (`providerInternalId`),
  KEY `_created_at` (`_createdAt`),
  KEY `_updated_at` (`_updatedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_1_targets`
--

LOCK TABLES `_1_targets` WRITE;
/*!40000 ALTER TABLE `_1_targets` DISABLE KEYS */;
/*!40000 ALTER TABLE `_1_targets` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_1_targets_perms`
--

DROP TABLE IF EXISTS `_1_targets_perms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_1_targets_perms` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_type` varchar(12) NOT NULL,
  `_permission` varchar(255) NOT NULL,
  `_document` varchar(255) NOT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_index1` (`_document`,`_type`,`_permission`),
  KEY `_permission` (`_permission`,`_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_1_targets_perms`
--

LOCK TABLES `_1_targets_perms` WRITE;
/*!40000 ALTER TABLE `_1_targets_perms` DISABLE KEYS */;
/*!40000 ALTER TABLE `_1_targets_perms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_1_teams`
--

DROP TABLE IF EXISTS `_1_teams`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_1_teams` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_uid` varchar(255) NOT NULL,
  `_createdAt` datetime(3) DEFAULT NULL,
  `_updatedAt` datetime(3) DEFAULT NULL,
  `_permissions` mediumtext DEFAULT NULL,
  `name` varchar(128) DEFAULT NULL,
  `total` int(11) DEFAULT NULL,
  `search` text DEFAULT NULL,
  `prefs` text DEFAULT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_uid` (`_uid`),
  KEY `_key_name` (`name`),
  KEY `_key_total` (`total`),
  KEY `_created_at` (`_createdAt`),
  KEY `_updated_at` (`_updatedAt`),
  FULLTEXT KEY `_key_search` (`search`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_1_teams`
--

LOCK TABLES `_1_teams` WRITE;
/*!40000 ALTER TABLE `_1_teams` DISABLE KEYS */;
/*!40000 ALTER TABLE `_1_teams` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_1_teams_perms`
--

DROP TABLE IF EXISTS `_1_teams_perms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_1_teams_perms` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_type` varchar(12) NOT NULL,
  `_permission` varchar(255) NOT NULL,
  `_document` varchar(255) NOT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_index1` (`_document`,`_type`,`_permission`),
  KEY `_permission` (`_permission`,`_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_1_teams_perms`
--

LOCK TABLES `_1_teams_perms` WRITE;
/*!40000 ALTER TABLE `_1_teams_perms` DISABLE KEYS */;
/*!40000 ALTER TABLE `_1_teams_perms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_1_tokens`
--

DROP TABLE IF EXISTS `_1_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_1_tokens` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_uid` varchar(255) NOT NULL,
  `_createdAt` datetime(3) DEFAULT NULL,
  `_updatedAt` datetime(3) DEFAULT NULL,
  `_permissions` mediumtext DEFAULT NULL,
  `userInternalId` varchar(255) DEFAULT NULL,
  `userId` varchar(255) DEFAULT NULL,
  `type` int(11) DEFAULT NULL,
  `secret` varchar(512) DEFAULT NULL,
  `expire` datetime(3) DEFAULT NULL,
  `userAgent` text DEFAULT NULL,
  `ip` varchar(45) DEFAULT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_uid` (`_uid`),
  KEY `_key_user` (`userInternalId`),
  KEY `_created_at` (`_createdAt`),
  KEY `_updated_at` (`_updatedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_1_tokens`
--

LOCK TABLES `_1_tokens` WRITE;
/*!40000 ALTER TABLE `_1_tokens` DISABLE KEYS */;
/*!40000 ALTER TABLE `_1_tokens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_1_tokens_perms`
--

DROP TABLE IF EXISTS `_1_tokens_perms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_1_tokens_perms` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_type` varchar(12) NOT NULL,
  `_permission` varchar(255) NOT NULL,
  `_document` varchar(255) NOT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_index1` (`_document`,`_type`,`_permission`),
  KEY `_permission` (`_permission`,`_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_1_tokens_perms`
--

LOCK TABLES `_1_tokens_perms` WRITE;
/*!40000 ALTER TABLE `_1_tokens_perms` DISABLE KEYS */;
/*!40000 ALTER TABLE `_1_tokens_perms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_1_topics`
--

DROP TABLE IF EXISTS `_1_topics`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_1_topics` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_uid` varchar(255) NOT NULL,
  `_createdAt` datetime(3) DEFAULT NULL,
  `_updatedAt` datetime(3) DEFAULT NULL,
  `_permissions` mediumtext DEFAULT NULL,
  `name` varchar(128) DEFAULT NULL,
  `subscribe` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`subscribe`)),
  `emailTotal` int(11) DEFAULT NULL,
  `smsTotal` int(11) DEFAULT NULL,
  `pushTotal` int(11) DEFAULT NULL,
  `targets` text DEFAULT NULL,
  `search` text DEFAULT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_uid` (`_uid`),
  KEY `_created_at` (`_createdAt`),
  KEY `_updated_at` (`_updatedAt`),
  FULLTEXT KEY `_key_name` (`name`),
  FULLTEXT KEY `_key_search` (`search`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_1_topics`
--

LOCK TABLES `_1_topics` WRITE;
/*!40000 ALTER TABLE `_1_topics` DISABLE KEYS */;
/*!40000 ALTER TABLE `_1_topics` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_1_topics_perms`
--

DROP TABLE IF EXISTS `_1_topics_perms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_1_topics_perms` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_type` varchar(12) NOT NULL,
  `_permission` varchar(255) NOT NULL,
  `_document` varchar(255) NOT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_index1` (`_document`,`_type`,`_permission`),
  KEY `_permission` (`_permission`,`_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_1_topics_perms`
--

LOCK TABLES `_1_topics_perms` WRITE;
/*!40000 ALTER TABLE `_1_topics_perms` DISABLE KEYS */;
/*!40000 ALTER TABLE `_1_topics_perms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_1_users`
--

DROP TABLE IF EXISTS `_1_users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_1_users` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_uid` varchar(255) NOT NULL,
  `_createdAt` datetime(3) DEFAULT NULL,
  `_updatedAt` datetime(3) DEFAULT NULL,
  `_permissions` mediumtext DEFAULT NULL,
  `name` varchar(256) DEFAULT NULL,
  `email` varchar(320) DEFAULT NULL,
  `phone` varchar(16) DEFAULT NULL,
  `status` tinyint(1) DEFAULT NULL,
  `labels` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`labels`)),
  `passwordHistory` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`passwordHistory`)),
  `password` text DEFAULT NULL,
  `hash` varchar(256) DEFAULT NULL,
  `hashOptions` text DEFAULT NULL,
  `passwordUpdate` datetime(3) DEFAULT NULL,
  `prefs` text DEFAULT NULL,
  `registration` datetime(3) DEFAULT NULL,
  `emailVerification` tinyint(1) DEFAULT NULL,
  `phoneVerification` tinyint(1) DEFAULT NULL,
  `reset` tinyint(1) DEFAULT NULL,
  `mfa` tinyint(1) DEFAULT NULL,
  `mfaRecoveryCodes` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`mfaRecoveryCodes`)),
  `authenticators` text DEFAULT NULL,
  `sessions` text DEFAULT NULL,
  `tokens` text DEFAULT NULL,
  `challenges` text DEFAULT NULL,
  `memberships` text DEFAULT NULL,
  `targets` text DEFAULT NULL,
  `search` text DEFAULT NULL,
  `accessedAt` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_uid` (`_uid`),
  UNIQUE KEY `_key_phone` (`phone`),
  UNIQUE KEY `_key_email` (`email`(256)),
  KEY `_key_name` (`name`),
  KEY `_key_status` (`status`),
  KEY `_key_passwordUpdate` (`passwordUpdate`),
  KEY `_key_registration` (`registration`),
  KEY `_key_emailVerification` (`emailVerification`),
  KEY `_key_phoneVerification` (`phoneVerification`),
  KEY `_key_accessedAt` (`accessedAt`),
  KEY `_created_at` (`_createdAt`),
  KEY `_updated_at` (`_updatedAt`),
  FULLTEXT KEY `_key_search` (`search`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_1_users`
--

LOCK TABLES `_1_users` WRITE;
/*!40000 ALTER TABLE `_1_users` DISABLE KEYS */;
/*!40000 ALTER TABLE `_1_users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_1_users_perms`
--

DROP TABLE IF EXISTS `_1_users_perms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_1_users_perms` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_type` varchar(12) NOT NULL,
  `_permission` varchar(255) NOT NULL,
  `_document` varchar(255) NOT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_index1` (`_document`,`_type`,`_permission`),
  KEY `_permission` (`_permission`,`_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_1_users_perms`
--

LOCK TABLES `_1_users_perms` WRITE;
/*!40000 ALTER TABLE `_1_users_perms` DISABLE KEYS */;
/*!40000 ALTER TABLE `_1_users_perms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_1_variables`
--

DROP TABLE IF EXISTS `_1_variables`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_1_variables` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_uid` varchar(255) NOT NULL,
  `_createdAt` datetime(3) DEFAULT NULL,
  `_updatedAt` datetime(3) DEFAULT NULL,
  `_permissions` mediumtext DEFAULT NULL,
  `resourceType` varchar(100) DEFAULT NULL,
  `resourceInternalId` varchar(255) DEFAULT NULL,
  `resourceId` varchar(255) DEFAULT NULL,
  `key` varchar(255) DEFAULT NULL,
  `value` varchar(8192) DEFAULT NULL,
  `search` text DEFAULT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_uid` (`_uid`),
  UNIQUE KEY `_key_uniqueKey` (`resourceId`,`key`,`resourceType`),
  KEY `_key_resourceInternalId` (`resourceInternalId`),
  KEY `_key_resourceType` (`resourceType`),
  KEY `_key_resourceId_resourceType` (`resourceId`,`resourceType`),
  KEY `_key_key` (`key`),
  KEY `_created_at` (`_createdAt`),
  KEY `_updated_at` (`_updatedAt`),
  FULLTEXT KEY `_fulltext_search` (`search`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_1_variables`
--

LOCK TABLES `_1_variables` WRITE;
/*!40000 ALTER TABLE `_1_variables` DISABLE KEYS */;
/*!40000 ALTER TABLE `_1_variables` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_1_variables_perms`
--

DROP TABLE IF EXISTS `_1_variables_perms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_1_variables_perms` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_type` varchar(12) NOT NULL,
  `_permission` varchar(255) NOT NULL,
  `_document` varchar(255) NOT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_index1` (`_document`,`_type`,`_permission`),
  KEY `_permission` (`_permission`,`_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_1_variables_perms`
--

LOCK TABLES `_1_variables_perms` WRITE;
/*!40000 ALTER TABLE `_1_variables_perms` DISABLE KEYS */;
/*!40000 ALTER TABLE `_1_variables_perms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_2__metadata`
--

DROP TABLE IF EXISTS `_2__metadata`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_2__metadata` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_uid` varchar(255) NOT NULL,
  `_createdAt` datetime(3) DEFAULT NULL,
  `_updatedAt` datetime(3) DEFAULT NULL,
  `_permissions` mediumtext DEFAULT NULL,
  `name` varchar(256) DEFAULT NULL,
  `attributes` mediumtext DEFAULT NULL,
  `indexes` mediumtext DEFAULT NULL,
  `documentSecurity` tinyint(1) DEFAULT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_uid` (`_uid`),
  KEY `_created_at` (`_createdAt`),
  KEY `_updated_at` (`_updatedAt`)
) ENGINE=InnoDB AUTO_INCREMENT=82 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_2__metadata`
--

LOCK TABLES `_2__metadata` WRITE;
/*!40000 ALTER TABLE `_2__metadata` DISABLE KEYS */;
INSERT INTO `_2__metadata` VALUES
(1,'audit','2025-03-21 09:02:53.975','2025-03-21 09:02:53.975','[\"create(\\\"any\\\")\"]','audit','[{\"$id\":\"userId\",\"type\":\"string\",\"size\":255,\"required\":true,\"signed\":true,\"array\":false,\"filters\":[]},{\"$id\":\"event\",\"type\":\"string\",\"size\":255,\"required\":true,\"signed\":true,\"array\":false,\"filters\":[]},{\"$id\":\"resource\",\"type\":\"string\",\"size\":255,\"required\":false,\"signed\":true,\"array\":false,\"filters\":[]},{\"$id\":\"userAgent\",\"type\":\"string\",\"size\":65534,\"required\":true,\"signed\":true,\"array\":false,\"filters\":[]},{\"$id\":\"ip\",\"type\":\"string\",\"size\":45,\"required\":true,\"signed\":true,\"array\":false,\"filters\":[]},{\"$id\":\"location\",\"type\":\"string\",\"size\":45,\"required\":false,\"signed\":true,\"array\":false,\"filters\":[]},{\"$id\":\"time\",\"type\":\"datetime\",\"format\":\"\",\"size\":0,\"signed\":true,\"required\":false,\"array\":false,\"filters\":[\"datetime\"]},{\"$id\":\"data\",\"type\":\"string\",\"size\":16777216,\"required\":false,\"signed\":true,\"array\":false,\"filters\":[\"json\"]}]','[{\"$id\":\"index2\",\"type\":\"key\",\"attributes\":[\"event\"],\"lengths\":[],\"orders\":[]},{\"$id\":\"index4\",\"type\":\"key\",\"attributes\":[\"userId\",\"event\"],\"lengths\":[],\"orders\":[]},{\"$id\":\"index5\",\"type\":\"key\",\"attributes\":[\"resource\",\"event\"],\"lengths\":[],\"orders\":[]},{\"$id\":\"index-time\",\"type\":\"key\",\"attributes\":[\"time\"],\"lengths\":[],\"orders\":[\"DESC\"]}]',1),
(2,'abuse','2025-03-21 09:02:54.120','2025-03-21 09:02:54.120','[\"create(\\\"any\\\")\"]','abuse','[{\"$id\":\"key\",\"type\":\"string\",\"size\":255,\"required\":true,\"signed\":true,\"array\":false,\"filters\":[]},{\"$id\":\"time\",\"type\":\"datetime\",\"size\":0,\"required\":true,\"signed\":false,\"array\":false,\"filters\":[\"datetime\"]},{\"$id\":\"count\",\"type\":\"integer\",\"size\":11,\"required\":true,\"signed\":false,\"array\":false,\"filters\":[]}]','[{\"$id\":\"unique1\",\"type\":\"unique\",\"attributes\":[\"key\",\"time\"],\"lengths\":[],\"orders\":[]},{\"$id\":\"index2\",\"type\":\"key\",\"attributes\":[\"time\"],\"lengths\":[],\"orders\":[]}]',1),
(3,'databases','2025-03-21 09:02:54.266','2025-03-21 09:02:54.266','[\"create(\\\"any\\\")\"]','databases','[{\"$id\":\"name\",\"type\":\"string\",\"size\":256,\"required\":true,\"signed\":true,\"array\":false,\"filters\":[]},{\"$id\":\"enabled\",\"type\":\"boolean\",\"signed\":true,\"size\":0,\"format\":\"\",\"filters\":[],\"required\":false,\"default\":true,\"array\":false},{\"$id\":\"search\",\"type\":\"string\",\"format\":\"\",\"size\":16384,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"originalId\",\"type\":\"string\",\"signed\":true,\"size\":255,\"format\":\"\",\"filters\":[],\"required\":false,\"default\":null,\"array\":false}]','[{\"$id\":\"_fulltext_search\",\"type\":\"fulltext\",\"attributes\":[\"search\"],\"lengths\":[],\"orders\":[]},{\"$id\":\"_key_name\",\"type\":\"key\",\"attributes\":[\"name\"],\"lengths\":[256],\"orders\":[\"ASC\"]}]',1),
(4,'attributes','2025-03-21 09:02:54.362','2025-03-21 09:02:54.362','[\"create(\\\"any\\\")\"]','attributes','[{\"$id\":\"databaseInternalId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"databaseId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":false,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"collectionInternalId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"collectionId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"key\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"type\",\"type\":\"string\",\"format\":\"\",\"size\":256,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"status\",\"type\":\"string\",\"format\":\"\",\"size\":16,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"error\",\"type\":\"string\",\"format\":\"\",\"size\":2048,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"size\",\"type\":\"integer\",\"format\":\"\",\"size\":0,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"required\",\"type\":\"boolean\",\"format\":\"\",\"size\":0,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"default\",\"type\":\"string\",\"format\":\"\",\"size\":16384,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"casting\"]},{\"$id\":\"signed\",\"type\":\"boolean\",\"size\":0,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"array\",\"type\":\"boolean\",\"size\":0,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"format\",\"type\":\"string\",\"size\":64,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"formatOptions\",\"type\":\"string\",\"size\":16384,\"signed\":true,\"required\":false,\"default\":{},\"array\":false,\"filters\":[\"json\",\"range\",\"enum\"]},{\"$id\":\"filters\",\"type\":\"string\",\"size\":64,\"signed\":true,\"required\":false,\"default\":null,\"array\":true,\"filters\":[]},{\"$id\":\"options\",\"type\":\"string\",\"size\":16384,\"signed\":false,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"json\"]}]','[{\"$id\":\"_key_db_collection\",\"type\":\"key\",\"attributes\":[\"databaseInternalId\",\"collectionInternalId\"],\"lengths\":[255,255],\"orders\":[\"ASC\",\"ASC\"]}]',1),
(5,'indexes','2025-03-21 09:02:54.462','2025-03-21 09:02:54.462','[\"create(\\\"any\\\")\"]','indexes','[{\"$id\":\"databaseInternalId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"databaseId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":false,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"collectionInternalId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"collectionId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"key\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"type\",\"type\":\"string\",\"format\":\"\",\"size\":16,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"status\",\"type\":\"string\",\"format\":\"\",\"size\":16,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"error\",\"type\":\"string\",\"format\":\"\",\"size\":2048,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"attributes\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":true,\"filters\":[]},{\"$id\":\"lengths\",\"type\":\"integer\",\"format\":\"\",\"size\":0,\"signed\":true,\"required\":false,\"default\":null,\"array\":true,\"filters\":[]},{\"$id\":\"orders\",\"type\":\"string\",\"format\":\"\",\"size\":4,\"signed\":true,\"required\":false,\"default\":null,\"array\":true,\"filters\":[]}]','[{\"$id\":\"_key_db_collection\",\"type\":\"key\",\"attributes\":[\"databaseInternalId\",\"collectionInternalId\"],\"lengths\":[255,255],\"orders\":[\"ASC\",\"ASC\"]}]',1),
(6,'functions','2025-03-21 09:02:54.675','2025-03-21 09:02:54.675','[\"create(\\\"any\\\")\"]','functions','[{\"$id\":\"execute\",\"type\":\"string\",\"format\":\"\",\"size\":128,\"signed\":true,\"required\":false,\"default\":null,\"array\":true,\"filters\":[]},{\"$id\":\"name\",\"type\":\"string\",\"format\":\"\",\"size\":2048,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"enabled\",\"type\":\"boolean\",\"signed\":true,\"size\":0,\"format\":\"\",\"filters\":[],\"required\":true,\"array\":false},{\"$id\":\"live\",\"type\":\"boolean\",\"signed\":true,\"size\":0,\"format\":\"\",\"filters\":[],\"required\":true,\"array\":false},{\"$id\":\"installationId\",\"type\":\"string\",\"signed\":true,\"size\":255,\"format\":\"\",\"filters\":[],\"required\":false,\"array\":false},{\"$id\":\"installationInternalId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"providerRepositoryId\",\"type\":\"string\",\"signed\":true,\"size\":255,\"format\":\"\",\"filters\":[],\"required\":false,\"array\":false},{\"$id\":\"repositoryId\",\"type\":\"string\",\"signed\":true,\"size\":255,\"format\":\"\",\"filters\":[],\"required\":false,\"array\":false},{\"$id\":\"repositoryInternalId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"providerBranch\",\"type\":\"string\",\"signed\":true,\"size\":255,\"format\":\"\",\"filters\":[],\"required\":false,\"array\":false},{\"$id\":\"providerRootDirectory\",\"type\":\"string\",\"signed\":true,\"size\":255,\"format\":\"\",\"filters\":[],\"required\":false,\"array\":false},{\"$id\":\"providerSilentMode\",\"type\":\"boolean\",\"signed\":true,\"size\":0,\"format\":\"\",\"filters\":[],\"required\":false,\"default\":false,\"array\":false},{\"$id\":\"logging\",\"type\":\"boolean\",\"signed\":true,\"size\":0,\"format\":\"\",\"filters\":[],\"required\":true,\"array\":false},{\"$id\":\"runtime\",\"type\":\"string\",\"format\":\"\",\"size\":2048,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"deploymentInternalId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"deployment\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"vars\",\"type\":\"string\",\"format\":\"\",\"size\":16384,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"subQueryVariables\"]},{\"$id\":\"varsProject\",\"type\":\"string\",\"format\":\"\",\"size\":16384,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"subQueryProjectVariables\"]},{\"$id\":\"events\",\"type\":\"string\",\"format\":\"\",\"size\":256,\"signed\":true,\"required\":false,\"default\":null,\"array\":true,\"filters\":[]},{\"$id\":\"scheduleInternalId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"scheduleId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"schedule\",\"type\":\"string\",\"format\":\"\",\"size\":128,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"timeout\",\"type\":\"integer\",\"format\":\"\",\"size\":0,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"search\",\"type\":\"string\",\"format\":\"\",\"size\":16384,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"version\",\"type\":\"string\",\"format\":\"\",\"size\":8,\"signed\":true,\"required\":false,\"default\":\"v4\",\"array\":false,\"filters\":[]},{\"array\":false,\"$id\":\"entrypoint\",\"type\":\"string\",\"format\":\"\",\"size\":16384,\"signed\":true,\"required\":false,\"default\":null,\"filters\":[]},{\"array\":false,\"$id\":\"commands\",\"type\":\"string\",\"format\":\"\",\"size\":16384,\"signed\":true,\"required\":false,\"default\":null,\"filters\":[]},{\"array\":false,\"$id\":\"specification\",\"type\":\"string\",\"format\":\"\",\"size\":128,\"signed\":false,\"required\":false,\"default\":\"s-1vcpu-512mb\",\"filters\":[]},{\"$id\":\"scopes\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":[],\"array\":true,\"filters\":[]}]','[{\"$id\":\"_key_search\",\"type\":\"fulltext\",\"attributes\":[\"search\"],\"lengths\":[],\"orders\":[]},{\"$id\":\"_key_name\",\"type\":\"key\",\"attributes\":[\"name\"],\"lengths\":[256],\"orders\":[\"ASC\"]},{\"$id\":\"_key_enabled\",\"type\":\"key\",\"attributes\":[\"enabled\"],\"lengths\":[],\"orders\":[\"ASC\"]},{\"$id\":\"_key_installationId\",\"type\":\"key\",\"attributes\":[\"installationId\"],\"lengths\":[255],\"orders\":[\"ASC\"]},{\"$id\":\"_key_installationInternalId\",\"type\":\"key\",\"attributes\":[\"installationInternalId\"],\"lengths\":[255],\"orders\":[\"ASC\"]},{\"$id\":\"_key_providerRepositoryId\",\"type\":\"key\",\"attributes\":[\"providerRepositoryId\"],\"lengths\":[255],\"orders\":[\"ASC\"]},{\"$id\":\"_key_repositoryId\",\"type\":\"key\",\"attributes\":[\"repositoryId\"],\"lengths\":[255],\"orders\":[\"ASC\"]},{\"$id\":\"_key_repositoryInternalId\",\"type\":\"key\",\"attributes\":[\"repositoryInternalId\"],\"lengths\":[255],\"orders\":[\"ASC\"]},{\"$id\":\"_key_runtime\",\"type\":\"key\",\"attributes\":[\"runtime\"],\"lengths\":[64],\"orders\":[\"ASC\"]},{\"$id\":\"_key_deployment\",\"type\":\"key\",\"attributes\":[\"deployment\"],\"lengths\":[],\"orders\":[\"ASC\"]}]',1),
(7,'deployments','2025-03-21 09:02:54.849','2025-03-21 09:02:54.849','[\"create(\\\"any\\\")\"]','deployments','[{\"$id\":\"resourceInternalId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"resourceId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"resourceType\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"buildInternalId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"buildId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"array\":false,\"$id\":\"entrypoint\",\"type\":\"string\",\"format\":\"\",\"size\":2048,\"signed\":true,\"required\":false,\"default\":null,\"filters\":[]},{\"array\":false,\"$id\":\"commands\",\"type\":\"string\",\"format\":\"\",\"size\":2048,\"signed\":true,\"required\":false,\"default\":null,\"filters\":[]},{\"$id\":\"path\",\"type\":\"string\",\"format\":\"\",\"size\":2048,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"type\",\"type\":\"string\",\"format\":\"\",\"size\":2048,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"installationId\",\"type\":\"string\",\"signed\":true,\"size\":255,\"format\":\"\",\"filters\":[],\"required\":false,\"array\":false},{\"$id\":\"installationInternalId\",\"type\":\"string\",\"signed\":true,\"size\":255,\"format\":\"\",\"filters\":[],\"required\":false,\"array\":false},{\"$id\":\"providerRepositoryId\",\"type\":\"string\",\"signed\":true,\"size\":255,\"format\":\"\",\"filters\":[],\"required\":false,\"array\":false},{\"$id\":\"repositoryId\",\"type\":\"string\",\"signed\":true,\"size\":255,\"format\":\"\",\"filters\":[],\"required\":false,\"array\":false},{\"$id\":\"repositoryInternalId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"providerRepositoryName\",\"type\":\"string\",\"signed\":true,\"size\":255,\"format\":\"\",\"filters\":[],\"required\":false,\"array\":false},{\"$id\":\"providerRepositoryOwner\",\"type\":\"string\",\"signed\":true,\"size\":255,\"format\":\"\",\"filters\":[],\"required\":false,\"array\":false},{\"$id\":\"providerRepositoryUrl\",\"type\":\"string\",\"signed\":true,\"size\":255,\"format\":\"\",\"filters\":[],\"required\":false,\"array\":false},{\"$id\":\"providerCommitHash\",\"type\":\"string\",\"signed\":true,\"size\":255,\"format\":\"\",\"filters\":[],\"required\":false,\"array\":false},{\"$id\":\"providerCommitAuthorUrl\",\"type\":\"string\",\"signed\":true,\"size\":255,\"format\":\"\",\"filters\":[],\"required\":false,\"array\":false},{\"$id\":\"providerCommitAuthor\",\"type\":\"string\",\"signed\":true,\"size\":255,\"format\":\"\",\"filters\":[],\"required\":false,\"array\":false},{\"$id\":\"providerCommitMessage\",\"type\":\"string\",\"signed\":true,\"size\":255,\"format\":\"\",\"filters\":[],\"required\":false,\"array\":false},{\"$id\":\"providerCommitUrl\",\"type\":\"string\",\"signed\":true,\"size\":255,\"format\":\"\",\"filters\":[],\"required\":false,\"array\":false},{\"$id\":\"providerBranch\",\"type\":\"string\",\"signed\":true,\"size\":255,\"format\":\"\",\"filters\":[],\"required\":false,\"array\":false},{\"$id\":\"providerBranchUrl\",\"type\":\"string\",\"signed\":true,\"size\":255,\"format\":\"\",\"filters\":[],\"required\":false,\"array\":false},{\"$id\":\"providerRootDirectory\",\"type\":\"string\",\"signed\":true,\"size\":255,\"format\":\"\",\"filters\":[],\"required\":false,\"array\":false},{\"$id\":\"providerCommentId\",\"type\":\"string\",\"signed\":true,\"size\":2048,\"format\":\"\",\"filters\":[],\"required\":false,\"array\":false},{\"$id\":\"size\",\"type\":\"integer\",\"format\":\"\",\"size\":0,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"metadata\",\"type\":\"string\",\"format\":\"\",\"size\":16384,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"json\"]},{\"$id\":\"chunksTotal\",\"type\":\"integer\",\"format\":\"\",\"size\":0,\"signed\":false,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"chunksUploaded\",\"type\":\"integer\",\"format\":\"\",\"size\":0,\"signed\":false,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"search\",\"type\":\"string\",\"format\":\"\",\"size\":16384,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"activate\",\"type\":\"boolean\",\"format\":\"\",\"size\":0,\"signed\":true,\"required\":false,\"default\":false,\"array\":false,\"filters\":[]}]','[{\"$id\":\"_key_resource\",\"type\":\"key\",\"attributes\":[\"resourceId\"],\"lengths\":[],\"orders\":[\"ASC\"]},{\"$id\":\"_key_resource_type\",\"type\":\"key\",\"attributes\":[\"resourceType\"],\"lengths\":[],\"orders\":[\"ASC\"]},{\"$id\":\"_key_search\",\"type\":\"fulltext\",\"attributes\":[\"search\"],\"lengths\":[],\"orders\":[]},{\"$id\":\"_key_size\",\"type\":\"key\",\"attributes\":[\"size\"],\"lengths\":[],\"orders\":[\"ASC\"]},{\"$id\":\"_key_buildId\",\"type\":\"key\",\"attributes\":[\"buildId\"],\"lengths\":[],\"orders\":[\"ASC\"]},{\"$id\":\"_key_activate\",\"type\":\"key\",\"attributes\":[\"activate\"],\"lengths\":[],\"orders\":[\"ASC\"]}]',1),
(8,'builds','2025-03-21 09:02:54.954','2025-03-21 09:02:54.954','[\"create(\\\"any\\\")\"]','builds','[{\"$id\":\"startTime\",\"type\":\"datetime\",\"format\":\"\",\"size\":0,\"signed\":false,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"datetime\"]},{\"$id\":\"endTime\",\"type\":\"datetime\",\"format\":\"\",\"size\":0,\"signed\":false,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"datetime\"]},{\"$id\":\"duration\",\"type\":\"integer\",\"format\":\"\",\"size\":0,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"size\",\"type\":\"integer\",\"format\":\"\",\"size\":0,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"deploymentInternalId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"deploymentId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"runtime\",\"type\":\"string\",\"format\":\"\",\"size\":2048,\"signed\":true,\"required\":true,\"default\":\"\",\"array\":false,\"filters\":[]},{\"$id\":\"status\",\"type\":\"string\",\"format\":\"\",\"size\":256,\"signed\":true,\"required\":true,\"default\":\"processing\",\"array\":false,\"filters\":[]},{\"$id\":\"path\",\"type\":\"string\",\"format\":\"\",\"size\":2048,\"signed\":true,\"required\":false,\"default\":\"\",\"array\":false,\"filters\":[]},{\"$id\":\"logs\",\"type\":\"string\",\"format\":\"\",\"size\":1000000,\"signed\":true,\"required\":false,\"default\":\"\",\"array\":false,\"filters\":[]},{\"$id\":\"sourceType\",\"type\":\"string\",\"format\":\"\",\"size\":2048,\"signed\":true,\"required\":true,\"default\":\"local\",\"array\":false,\"filters\":[]},{\"$id\":\"source\",\"type\":\"string\",\"format\":\"\",\"size\":2048,\"signed\":true,\"required\":true,\"default\":\"\",\"array\":false,\"filters\":[]}]','[{\"$id\":\"_key_deployment\",\"type\":\"key\",\"attributes\":[\"deploymentId\"],\"lengths\":[255],\"orders\":[\"ASC\"]}]',1),
(9,'executions','2025-03-21 09:02:55.156','2025-03-21 09:02:55.156','[\"create(\\\"any\\\")\"]','executions','[{\"$id\":\"functionInternalId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"functionId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"deploymentInternalId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"deploymentId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"array\":false,\"$id\":\"trigger\",\"type\":\"string\",\"format\":\"\",\"size\":128,\"signed\":true,\"required\":false,\"default\":null,\"filters\":[]},{\"$id\":\"status\",\"type\":\"string\",\"format\":\"\",\"size\":128,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"duration\",\"type\":\"double\",\"format\":\"\",\"size\":0,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"errors\",\"type\":\"string\",\"format\":\"\",\"size\":1000000,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"logs\",\"type\":\"string\",\"format\":\"\",\"size\":1000000,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"array\":false,\"$id\":\"requestMethod\",\"type\":\"string\",\"format\":\"\",\"size\":128,\"signed\":true,\"required\":false,\"default\":null,\"filters\":[]},{\"array\":false,\"$id\":\"requestPath\",\"type\":\"string\",\"format\":\"\",\"size\":2048,\"signed\":true,\"required\":false,\"default\":null,\"filters\":[]},{\"$id\":\"requestHeaders\",\"type\":\"string\",\"format\":\"\",\"size\":16384,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"json\"]},{\"$id\":\"responseStatusCode\",\"type\":\"integer\",\"format\":\"\",\"size\":0,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"responseHeaders\",\"type\":\"string\",\"format\":\"\",\"size\":16384,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"json\"]},{\"$id\":\"search\",\"type\":\"string\",\"format\":\"\",\"size\":16384,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"scheduledAt\",\"type\":\"datetime\",\"format\":\"\",\"size\":0,\"signed\":false,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"datetime\"]},{\"$id\":\"scheduleInternalId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"scheduleId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]}]','[{\"$id\":\"_key_function\",\"type\":\"key\",\"attributes\":[\"functionId\"],\"lengths\":[255],\"orders\":[\"ASC\"]},{\"$id\":\"_fulltext_search\",\"type\":\"fulltext\",\"attributes\":[\"search\"],\"lengths\":[],\"orders\":[]},{\"$id\":\"_key_trigger\",\"type\":\"key\",\"attributes\":[\"trigger\"],\"lengths\":[32],\"orders\":[\"ASC\"]},{\"$id\":\"_key_status\",\"type\":\"key\",\"attributes\":[\"status\"],\"lengths\":[32],\"orders\":[\"ASC\"]},{\"$id\":\"_key_requestMethod\",\"type\":\"key\",\"attributes\":[\"requestMethod\"],\"lengths\":[128],\"orders\":[\"ASC\"]},{\"$id\":\"_key_requestPath\",\"type\":\"key\",\"attributes\":[\"requestPath\"],\"lengths\":[255],\"orders\":[\"ASC\"]},{\"$id\":\"_key_deployment\",\"type\":\"key\",\"attributes\":[\"deploymentId\"],\"lengths\":[255],\"orders\":[\"ASC\"]},{\"$id\":\"_key_responseStatusCode\",\"type\":\"key\",\"attributes\":[\"responseStatusCode\"],\"lengths\":[],\"orders\":[\"ASC\"]},{\"$id\":\"_key_duration\",\"type\":\"key\",\"attributes\":[\"duration\"],\"lengths\":[],\"orders\":[\"ASC\"]}]',1),
(10,'variables','2025-03-21 09:02:55.322','2025-03-21 09:02:55.322','[\"create(\\\"any\\\")\"]','variables','[{\"$id\":\"resourceType\",\"type\":\"string\",\"format\":\"\",\"size\":100,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"resourceInternalId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"resourceId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"key\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"value\",\"type\":\"string\",\"format\":\"\",\"size\":8192,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[\"encrypt\"]},{\"$id\":\"search\",\"type\":\"string\",\"format\":\"\",\"size\":16384,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]}]','[{\"$id\":\"_key_resourceInternalId\",\"type\":\"key\",\"attributes\":[\"resourceInternalId\"],\"lengths\":[255],\"orders\":[]},{\"$id\":\"_key_resourceType\",\"type\":\"key\",\"attributes\":[\"resourceType\"],\"lengths\":[],\"orders\":[\"ASC\"]},{\"$id\":\"_key_resourceId_resourceType\",\"type\":\"key\",\"attributes\":[\"resourceId\",\"resourceType\"],\"lengths\":[255,100],\"orders\":[\"ASC\",\"ASC\"]},{\"$id\":\"_key_uniqueKey\",\"type\":\"unique\",\"attributes\":[\"resourceId\",\"key\",\"resourceType\"],\"lengths\":[255,255,100],\"orders\":[\"ASC\",\"ASC\",\"ASC\"]},{\"$id\":\"_key_key\",\"type\":\"key\",\"attributes\":[\"key\"],\"lengths\":[255],\"orders\":[\"ASC\"]},{\"$id\":\"_fulltext_search\",\"type\":\"fulltext\",\"attributes\":[\"search\"],\"lengths\":[],\"orders\":[]}]',1),
(11,'migrations','2025-03-21 09:02:55.477','2025-03-21 09:02:55.477','[\"create(\\\"any\\\")\"]','migrations','[{\"$id\":\"status\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"stage\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"source\",\"type\":\"string\",\"format\":\"\",\"size\":8192,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"destination\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"credentials\",\"type\":\"string\",\"format\":\"\",\"size\":65536,\"signed\":true,\"required\":false,\"default\":[],\"array\":false,\"filters\":[\"json\",\"encrypt\"]},{\"$id\":\"resources\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":true,\"default\":[],\"array\":true,\"filters\":[]},{\"$id\":\"statusCounters\",\"type\":\"string\",\"format\":\"\",\"size\":3000,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[\"json\"]},{\"$id\":\"resourceData\",\"type\":\"string\",\"format\":\"\",\"size\":131070,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[\"json\"]},{\"$id\":\"errors\",\"type\":\"string\",\"format\":\"\",\"size\":65535,\"signed\":true,\"required\":true,\"default\":null,\"array\":true,\"filters\":[]},{\"$id\":\"search\",\"type\":\"string\",\"format\":\"\",\"size\":16384,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]}]','[{\"$id\":\"_key_status\",\"type\":\"key\",\"attributes\":[\"status\"],\"lengths\":[255],\"orders\":[\"ASC\"]},{\"$id\":\"_key_stage\",\"type\":\"key\",\"attributes\":[\"stage\"],\"lengths\":[255],\"orders\":[\"ASC\"]},{\"$id\":\"_key_source\",\"type\":\"key\",\"attributes\":[\"source\"],\"lengths\":[255],\"orders\":[\"ASC\"]},{\"$id\":\"_fulltext_search\",\"type\":\"fulltext\",\"attributes\":[\"search\"],\"lengths\":[],\"orders\":[]}]',1),
(12,'cache','2025-03-21 09:02:55.579','2025-03-21 09:02:55.579','[\"create(\\\"any\\\")\"]','cache','[{\"$id\":\"resource\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"resourceType\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"mimeType\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"accessedAt\",\"type\":\"datetime\",\"format\":\"\",\"size\":0,\"signed\":false,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"datetime\"]},{\"$id\":\"signature\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]}]','[{\"$id\":\"_key_accessedAt\",\"type\":\"key\",\"attributes\":[\"accessedAt\"],\"lengths\":[],\"orders\":[]},{\"$id\":\"_key_resource\",\"type\":\"key\",\"attributes\":[\"resource\"],\"lengths\":[],\"orders\":[]}]',1),
(13,'users','2025-03-21 09:02:55.774','2025-03-21 09:02:55.774','[\"create(\\\"any\\\")\"]','users','[{\"$id\":\"name\",\"type\":\"string\",\"format\":\"\",\"size\":256,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"email\",\"type\":\"string\",\"format\":\"\",\"size\":320,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"phone\",\"type\":\"string\",\"format\":\"\",\"size\":16,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"status\",\"type\":\"boolean\",\"format\":\"\",\"size\":0,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"labels\",\"type\":\"string\",\"format\":\"\",\"size\":128,\"signed\":true,\"required\":false,\"default\":null,\"array\":true,\"filters\":[]},{\"$id\":\"passwordHistory\",\"type\":\"string\",\"format\":\"\",\"size\":16384,\"signed\":true,\"required\":false,\"default\":null,\"array\":true,\"filters\":[]},{\"$id\":\"password\",\"type\":\"string\",\"format\":\"\",\"size\":16384,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"encrypt\"]},{\"$id\":\"hash\",\"type\":\"string\",\"format\":\"\",\"size\":256,\"signed\":true,\"required\":false,\"default\":\"argon2\",\"array\":false,\"filters\":[]},{\"$id\":\"hashOptions\",\"type\":\"string\",\"format\":\"\",\"size\":65535,\"signed\":true,\"required\":false,\"default\":{\"type\":\"argon2\",\"memoryCost\":2048,\"timeCost\":4,\"threads\":3},\"array\":false,\"filters\":[\"json\"]},{\"$id\":\"passwordUpdate\",\"type\":\"datetime\",\"format\":\"\",\"size\":0,\"signed\":false,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"datetime\"]},{\"$id\":\"prefs\",\"type\":\"string\",\"format\":\"\",\"size\":65535,\"signed\":true,\"required\":false,\"default\":{},\"array\":false,\"filters\":[\"json\"]},{\"$id\":\"registration\",\"type\":\"datetime\",\"format\":\"\",\"size\":0,\"signed\":false,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"datetime\"]},{\"$id\":\"emailVerification\",\"type\":\"boolean\",\"format\":\"\",\"size\":0,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"phoneVerification\",\"type\":\"boolean\",\"format\":\"\",\"size\":0,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"reset\",\"type\":\"boolean\",\"format\":\"\",\"size\":0,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"mfa\",\"type\":\"boolean\",\"format\":\"\",\"size\":0,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"mfaRecoveryCodes\",\"type\":\"string\",\"format\":\"\",\"size\":256,\"signed\":true,\"required\":false,\"default\":[],\"array\":true,\"filters\":[\"encrypt\"]},{\"$id\":\"authenticators\",\"type\":\"string\",\"format\":\"\",\"size\":16384,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"subQueryAuthenticators\"]},{\"$id\":\"sessions\",\"type\":\"string\",\"format\":\"\",\"size\":16384,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"subQuerySessions\"]},{\"$id\":\"tokens\",\"type\":\"string\",\"format\":\"\",\"size\":16384,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"subQueryTokens\"]},{\"$id\":\"challenges\",\"type\":\"string\",\"format\":\"\",\"size\":16384,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"subQueryChallenges\"]},{\"$id\":\"memberships\",\"type\":\"string\",\"format\":\"\",\"size\":16384,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"subQueryMemberships\"]},{\"$id\":\"targets\",\"type\":\"string\",\"format\":\"\",\"size\":16384,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"subQueryTargets\"]},{\"$id\":\"search\",\"type\":\"string\",\"format\":\"\",\"size\":16384,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"userSearch\"]},{\"$id\":\"accessedAt\",\"type\":\"datetime\",\"format\":\"\",\"size\":0,\"signed\":false,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"datetime\"]}]','[{\"$id\":\"_key_name\",\"type\":\"key\",\"attributes\":[\"name\"],\"lengths\":[256],\"orders\":[\"ASC\"]},{\"$id\":\"_key_email\",\"type\":\"unique\",\"attributes\":[\"email\"],\"lengths\":[256],\"orders\":[\"ASC\"]},{\"$id\":\"_key_phone\",\"type\":\"unique\",\"attributes\":[\"phone\"],\"lengths\":[16],\"orders\":[\"ASC\"]},{\"$id\":\"_key_status\",\"type\":\"key\",\"attributes\":[\"status\"],\"lengths\":[],\"orders\":[\"ASC\"]},{\"$id\":\"_key_passwordUpdate\",\"type\":\"key\",\"attributes\":[\"passwordUpdate\"],\"lengths\":[],\"orders\":[\"ASC\"]},{\"$id\":\"_key_registration\",\"type\":\"key\",\"attributes\":[\"registration\"],\"lengths\":[],\"orders\":[\"ASC\"]},{\"$id\":\"_key_emailVerification\",\"type\":\"key\",\"attributes\":[\"emailVerification\"],\"lengths\":[],\"orders\":[\"ASC\"]},{\"$id\":\"_key_phoneVerification\",\"type\":\"key\",\"attributes\":[\"phoneVerification\"],\"lengths\":[],\"orders\":[\"ASC\"]},{\"$id\":\"_key_search\",\"type\":\"fulltext\",\"attributes\":[\"search\"],\"lengths\":[],\"orders\":[]},{\"$id\":\"_key_accessedAt\",\"type\":\"key\",\"attributes\":[\"accessedAt\"],\"lengths\":[],\"orders\":[]}]',1),
(14,'tokens','2025-03-21 09:02:55.875','2025-03-21 09:02:55.875','[\"create(\\\"any\\\")\"]','tokens','[{\"$id\":\"userInternalId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"userId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"type\",\"type\":\"integer\",\"format\":\"\",\"size\":0,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"secret\",\"type\":\"string\",\"format\":\"\",\"size\":512,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"encrypt\"]},{\"$id\":\"expire\",\"type\":\"datetime\",\"format\":\"\",\"size\":0,\"signed\":false,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"datetime\"]},{\"$id\":\"userAgent\",\"type\":\"string\",\"format\":\"\",\"size\":16384,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"ip\",\"type\":\"string\",\"format\":\"\",\"size\":45,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]}]','[{\"$id\":\"_key_user\",\"type\":\"key\",\"attributes\":[\"userInternalId\"],\"lengths\":[255],\"orders\":[\"ASC\"]}]',1),
(15,'authenticators','2025-03-21 09:02:55.971','2025-03-21 09:02:55.971','[\"create(\\\"any\\\")\"]','authenticators','[{\"$id\":\"userInternalId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"userId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"type\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"verified\",\"type\":\"boolean\",\"format\":\"\",\"size\":0,\"signed\":true,\"required\":false,\"default\":false,\"array\":false,\"filters\":[]},{\"$id\":\"data\",\"type\":\"string\",\"format\":\"\",\"size\":65535,\"signed\":true,\"required\":false,\"default\":[],\"array\":false,\"filters\":[\"json\",\"encrypt\"]}]','[{\"$id\":\"_key_userInternalId\",\"type\":\"key\",\"attributes\":[\"userInternalId\"],\"lengths\":[255],\"orders\":[\"ASC\"]}]',1),
(16,'challenges','2025-03-21 09:02:56.069','2025-03-21 09:02:56.069','[\"create(\\\"any\\\")\"]','challenges','[{\"$id\":\"userInternalId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"userId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"type\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"token\",\"type\":\"string\",\"format\":\"\",\"size\":512,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"encrypt\"]},{\"$id\":\"code\",\"type\":\"string\",\"format\":\"\",\"size\":512,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"encrypt\"]},{\"$id\":\"expire\",\"type\":\"datetime\",\"format\":\"\",\"size\":0,\"signed\":false,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"datetime\"]}]','[{\"$id\":\"_key_user\",\"type\":\"key\",\"attributes\":[\"userInternalId\"],\"lengths\":[255],\"orders\":[\"ASC\"]}]',1),
(17,'sessions','2025-03-21 09:02:56.165','2025-03-21 09:02:56.165','[\"create(\\\"any\\\")\"]','sessions','[{\"$id\":\"userInternalId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"userId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"provider\",\"type\":\"string\",\"format\":\"\",\"size\":128,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"providerUid\",\"type\":\"string\",\"format\":\"\",\"size\":2048,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"providerAccessToken\",\"type\":\"string\",\"format\":\"\",\"size\":16384,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"encrypt\"]},{\"$id\":\"providerAccessTokenExpiry\",\"type\":\"datetime\",\"format\":\"\",\"size\":0,\"signed\":false,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"datetime\"]},{\"$id\":\"providerRefreshToken\",\"type\":\"string\",\"format\":\"\",\"size\":16384,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"encrypt\"]},{\"$id\":\"secret\",\"type\":\"string\",\"format\":\"\",\"size\":512,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"encrypt\"]},{\"$id\":\"userAgent\",\"type\":\"string\",\"format\":\"\",\"size\":16384,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"ip\",\"type\":\"string\",\"format\":\"\",\"size\":45,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"countryCode\",\"type\":\"string\",\"format\":\"\",\"size\":2,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"osCode\",\"type\":\"string\",\"format\":\"\",\"size\":256,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"osName\",\"type\":\"string\",\"format\":\"\",\"size\":256,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"osVersion\",\"type\":\"string\",\"format\":\"\",\"size\":256,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"clientType\",\"type\":\"string\",\"format\":\"\",\"size\":256,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"clientCode\",\"type\":\"string\",\"format\":\"\",\"size\":256,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"clientName\",\"type\":\"string\",\"format\":\"\",\"size\":256,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"clientVersion\",\"type\":\"string\",\"format\":\"\",\"size\":256,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"clientEngine\",\"type\":\"string\",\"format\":\"\",\"size\":256,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"clientEngineVersion\",\"type\":\"string\",\"format\":\"\",\"size\":256,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"deviceName\",\"type\":\"string\",\"format\":\"\",\"size\":256,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"deviceBrand\",\"type\":\"string\",\"format\":\"\",\"size\":256,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"deviceModel\",\"type\":\"string\",\"format\":\"\",\"size\":256,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"factors\",\"type\":\"string\",\"format\":\"\",\"size\":256,\"signed\":true,\"required\":false,\"default\":[],\"array\":true,\"filters\":[]},{\"$id\":\"expire\",\"type\":\"datetime\",\"format\":\"\",\"size\":0,\"signed\":false,\"required\":true,\"default\":null,\"array\":false,\"filters\":[\"datetime\"]},{\"$id\":\"mfaUpdatedAt\",\"type\":\"datetime\",\"format\":\"\",\"size\":0,\"signed\":false,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"datetime\"]}]','[{\"$id\":\"_key_provider_providerUid\",\"type\":\"key\",\"attributes\":[\"provider\",\"providerUid\"],\"lengths\":[128,128],\"orders\":[\"ASC\",\"ASC\"]},{\"$id\":\"_key_user\",\"type\":\"key\",\"attributes\":[\"userInternalId\"],\"lengths\":[255],\"orders\":[\"ASC\"]}]',1),
(18,'identities','2025-03-21 09:02:56.298','2025-03-21 09:02:56.298','[\"create(\\\"any\\\")\"]','identities','[{\"$id\":\"userInternalId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"userId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"provider\",\"type\":\"string\",\"format\":\"\",\"size\":128,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"providerUid\",\"type\":\"string\",\"format\":\"\",\"size\":2048,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"providerEmail\",\"type\":\"string\",\"format\":\"\",\"size\":320,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"providerAccessToken\",\"type\":\"string\",\"format\":\"\",\"size\":16384,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"encrypt\"]},{\"$id\":\"providerAccessTokenExpiry\",\"type\":\"datetime\",\"format\":\"\",\"size\":0,\"signed\":false,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"datetime\"]},{\"$id\":\"providerRefreshToken\",\"type\":\"string\",\"format\":\"\",\"size\":16384,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"encrypt\"]},{\"$id\":\"secrets\",\"type\":\"string\",\"format\":\"\",\"size\":16384,\"signed\":true,\"required\":false,\"default\":[],\"array\":false,\"filters\":[\"json\",\"encrypt\"]}]','[{\"$id\":\"_key_userInternalId_provider_providerUid\",\"type\":\"unique\",\"attributes\":[\"userInternalId\",\"provider\",\"providerUid\"],\"lengths\":[11,128,128],\"orders\":[\"ASC\",\"ASC\"]},{\"$id\":\"_key_provider_providerUid\",\"type\":\"unique\",\"attributes\":[\"provider\",\"providerUid\"],\"lengths\":[128,128],\"orders\":[\"ASC\",\"ASC\"]},{\"$id\":\"_key_userId\",\"type\":\"key\",\"attributes\":[\"userId\"],\"lengths\":[255],\"orders\":[\"ASC\"]},{\"$id\":\"_key_userInternalId\",\"type\":\"key\",\"attributes\":[\"userInternalId\"],\"lengths\":[255],\"orders\":[\"ASC\"]},{\"$id\":\"_key_provider\",\"type\":\"key\",\"attributes\":[\"provider\"],\"lengths\":[128],\"orders\":[\"ASC\"]},{\"$id\":\"_key_providerUid\",\"type\":\"key\",\"attributes\":[\"providerUid\"],\"lengths\":[255],\"orders\":[\"ASC\"]},{\"$id\":\"_key_providerEmail\",\"type\":\"key\",\"attributes\":[\"providerEmail\"],\"lengths\":[255],\"orders\":[\"ASC\"]},{\"$id\":\"_key_providerAccessTokenExpiry\",\"type\":\"key\",\"attributes\":[\"providerAccessTokenExpiry\"],\"lengths\":[],\"orders\":[\"ASC\"]}]',1),
(19,'teams','2025-03-21 09:02:56.444','2025-03-21 09:02:56.444','[\"create(\\\"any\\\")\"]','teams','[{\"$id\":\"name\",\"type\":\"string\",\"format\":\"\",\"size\":128,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"total\",\"type\":\"integer\",\"format\":\"\",\"size\":0,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"search\",\"type\":\"string\",\"format\":\"\",\"size\":16384,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"prefs\",\"type\":\"string\",\"format\":\"\",\"size\":65535,\"signed\":true,\"required\":false,\"default\":{},\"array\":false,\"filters\":[\"json\"]}]','[{\"$id\":\"_key_search\",\"type\":\"fulltext\",\"attributes\":[\"search\"],\"lengths\":[],\"orders\":[]},{\"$id\":\"_key_name\",\"type\":\"key\",\"attributes\":[\"name\"],\"lengths\":[128],\"orders\":[\"ASC\"]},{\"$id\":\"_key_total\",\"type\":\"key\",\"attributes\":[\"total\"],\"lengths\":[],\"orders\":[\"ASC\"]}]',1),
(20,'memberships','2025-03-21 09:02:56.639','2025-03-21 09:02:56.639','[\"create(\\\"any\\\")\"]','memberships','[{\"$id\":\"userInternalId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"userId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"teamInternalId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"teamId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"roles\",\"type\":\"string\",\"format\":\"\",\"size\":128,\"signed\":true,\"required\":false,\"default\":null,\"array\":true,\"filters\":[]},{\"$id\":\"invited\",\"type\":\"datetime\",\"format\":\"\",\"size\":0,\"signed\":false,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"datetime\"]},{\"$id\":\"joined\",\"type\":\"datetime\",\"format\":\"\",\"size\":0,\"signed\":false,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"datetime\"]},{\"$id\":\"confirm\",\"type\":\"boolean\",\"format\":\"\",\"size\":0,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"secret\",\"type\":\"string\",\"format\":\"\",\"size\":256,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"encrypt\"]},{\"$id\":\"search\",\"type\":\"string\",\"format\":\"\",\"size\":16384,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]}]','[{\"$id\":\"_key_unique\",\"type\":\"unique\",\"attributes\":[\"teamInternalId\",\"userInternalId\"],\"lengths\":[255,255],\"orders\":[\"ASC\",\"ASC\"]},{\"$id\":\"_key_user\",\"type\":\"key\",\"attributes\":[\"userInternalId\"],\"lengths\":[255],\"orders\":[\"ASC\"]},{\"$id\":\"_key_team\",\"type\":\"key\",\"attributes\":[\"teamInternalId\"],\"lengths\":[255],\"orders\":[\"ASC\"]},{\"$id\":\"_key_search\",\"type\":\"fulltext\",\"attributes\":[\"search\"],\"lengths\":[],\"orders\":[]},{\"$id\":\"_key_userId\",\"type\":\"key\",\"attributes\":[\"userId\"],\"lengths\":[255],\"orders\":[\"ASC\"]},{\"$id\":\"_key_teamId\",\"type\":\"key\",\"attributes\":[\"teamId\"],\"lengths\":[255],\"orders\":[\"ASC\"]},{\"$id\":\"_key_invited\",\"type\":\"key\",\"attributes\":[\"invited\"],\"lengths\":[],\"orders\":[\"ASC\"]},{\"$id\":\"_key_joined\",\"type\":\"key\",\"attributes\":[\"joined\"],\"lengths\":[],\"orders\":[\"ASC\"]},{\"$id\":\"_key_confirm\",\"type\":\"key\",\"attributes\":[\"confirm\"],\"lengths\":[],\"orders\":[\"ASC\"]}]',1),
(21,'buckets','2025-03-21 09:02:56.839','2025-03-21 09:02:56.839','[\"create(\\\"any\\\")\"]','buckets','[{\"$id\":\"enabled\",\"type\":\"boolean\",\"signed\":true,\"size\":0,\"format\":\"\",\"filters\":[],\"required\":true,\"array\":false},{\"$id\":\"name\",\"type\":\"string\",\"signed\":true,\"size\":128,\"format\":\"\",\"filters\":[],\"required\":true,\"array\":false},{\"$id\":\"fileSecurity\",\"type\":\"boolean\",\"signed\":true,\"size\":1,\"format\":\"\",\"filters\":[],\"required\":false,\"array\":false},{\"$id\":\"maximumFileSize\",\"type\":\"integer\",\"signed\":false,\"size\":8,\"format\":\"\",\"filters\":[],\"required\":true,\"array\":false},{\"$id\":\"allowedFileExtensions\",\"type\":\"string\",\"signed\":true,\"size\":64,\"format\":\"\",\"filters\":[],\"required\":true,\"array\":true},{\"$id\":\"compression\",\"type\":\"string\",\"signed\":true,\"size\":10,\"format\":\"\",\"filters\":[],\"required\":true,\"array\":false},{\"$id\":\"encryption\",\"type\":\"boolean\",\"signed\":true,\"size\":0,\"format\":\"\",\"filters\":[],\"required\":true,\"array\":false},{\"$id\":\"antivirus\",\"type\":\"boolean\",\"signed\":true,\"size\":0,\"format\":\"\",\"filters\":[],\"required\":true,\"array\":false},{\"$id\":\"search\",\"type\":\"string\",\"format\":\"\",\"size\":16384,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]}]','[{\"$id\":\"_fulltext_name\",\"type\":\"fulltext\",\"attributes\":[\"name\"],\"lengths\":[],\"orders\":[]},{\"$id\":\"_key_search\",\"type\":\"fulltext\",\"attributes\":[\"search\"],\"lengths\":[],\"orders\":[]},{\"$id\":\"_key_enabled\",\"type\":\"key\",\"attributes\":[\"enabled\"],\"lengths\":[],\"orders\":[\"ASC\"]},{\"$id\":\"_key_name\",\"type\":\"key\",\"attributes\":[\"name\"],\"lengths\":[],\"orders\":[\"ASC\"]},{\"$id\":\"_key_fileSecurity\",\"type\":\"key\",\"attributes\":[\"fileSecurity\"],\"lengths\":[],\"orders\":[\"ASC\"]},{\"$id\":\"_key_maximumFileSize\",\"type\":\"key\",\"attributes\":[\"maximumFileSize\"],\"lengths\":[],\"orders\":[\"ASC\"]},{\"$id\":\"_key_encryption\",\"type\":\"key\",\"attributes\":[\"encryption\"],\"lengths\":[],\"orders\":[\"ASC\"]},{\"$id\":\"_key_antivirus\",\"type\":\"key\",\"attributes\":[\"antivirus\"],\"lengths\":[],\"orders\":[\"ASC\"]}]',1),
(22,'stats','2025-03-21 09:02:56.956','2025-03-21 09:02:56.956','[\"create(\\\"any\\\")\"]','stats','[{\"$id\":\"metric\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"region\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"value\",\"type\":\"integer\",\"format\":\"\",\"size\":8,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"time\",\"type\":\"datetime\",\"format\":\"\",\"size\":0,\"signed\":false,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"datetime\"]},{\"$id\":\"period\",\"type\":\"string\",\"format\":\"\",\"size\":4,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]}]','[{\"$id\":\"_key_time\",\"type\":\"key\",\"attributes\":[\"time\"],\"lengths\":[],\"orders\":[\"DESC\"]},{\"$id\":\"_key_period_time\",\"type\":\"key\",\"attributes\":[\"period\",\"time\"],\"lengths\":[],\"orders\":[\"ASC\"]},{\"$id\":\"_key_metric_period_time\",\"type\":\"unique\",\"attributes\":[\"metric\",\"period\",\"time\"],\"lengths\":[],\"orders\":[\"DESC\"]}]',1),
(23,'providers','2025-03-21 09:02:57.142','2025-03-21 09:02:57.142','[\"create(\\\"any\\\")\"]','providers','[{\"$id\":\"name\",\"type\":\"string\",\"format\":\"\",\"size\":128,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"provider\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"type\",\"type\":\"string\",\"format\":\"\",\"size\":128,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"enabled\",\"type\":\"boolean\",\"signed\":true,\"size\":0,\"format\":\"\",\"filters\":[],\"required\":true,\"default\":true,\"array\":false},{\"$id\":\"credentials\",\"type\":\"string\",\"format\":\"\",\"size\":16384,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[\"json\",\"encrypt\"]},{\"$id\":\"options\",\"type\":\"string\",\"format\":\"\",\"size\":16384,\"signed\":true,\"required\":false,\"default\":[],\"array\":false,\"filters\":[\"json\"]},{\"$id\":\"search\",\"type\":\"string\",\"format\":\"\",\"size\":65535,\"signed\":true,\"required\":false,\"default\":\"\",\"array\":false,\"filters\":[\"providerSearch\"]}]','[{\"$id\":\"_key_provider\",\"type\":\"key\",\"attributes\":[\"provider\"],\"lengths\":[],\"orders\":[\"ASC\"]},{\"$id\":\"_key_name\",\"type\":\"fulltext\",\"attributes\":[\"name\"],\"lengths\":[],\"orders\":[\"ASC\"]},{\"$id\":\"_key_type\",\"type\":\"key\",\"attributes\":[\"type\"],\"lengths\":[],\"orders\":[\"ASC\"]},{\"$id\":\"_key_enabled_type\",\"type\":\"key\",\"attributes\":[\"enabled\",\"type\"],\"lengths\":[],\"orders\":[\"ASC\"]},{\"$id\":\"_key_search\",\"type\":\"fulltext\",\"attributes\":[\"search\"],\"lengths\":[],\"orders\":[]}]',1),
(24,'messages','2025-03-21 09:02:57.273','2025-03-21 09:02:57.273','[\"create(\\\"any\\\")\"]','messages','[{\"$id\":\"providerType\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"status\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":true,\"default\":\"processing\",\"array\":false,\"filters\":[]},{\"$id\":\"data\",\"type\":\"string\",\"format\":\"\",\"size\":65535,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[\"json\"]},{\"$id\":\"topics\",\"type\":\"string\",\"format\":\"\",\"size\":21845,\"signed\":true,\"required\":false,\"default\":[],\"array\":true,\"filters\":[]},{\"$id\":\"users\",\"type\":\"string\",\"format\":\"\",\"size\":21845,\"signed\":true,\"required\":false,\"default\":[],\"array\":true,\"filters\":[]},{\"$id\":\"targets\",\"type\":\"string\",\"format\":\"\",\"size\":21845,\"signed\":true,\"required\":false,\"default\":[],\"array\":true,\"filters\":[]},{\"$id\":\"scheduledAt\",\"type\":\"datetime\",\"format\":\"\",\"size\":0,\"signed\":false,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"datetime\"]},{\"$id\":\"scheduleInternalId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"scheduleId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"deliveredAt\",\"type\":\"datetime\",\"format\":\"\",\"size\":0,\"signed\":false,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"datetime\"]},{\"$id\":\"deliveryErrors\",\"type\":\"string\",\"format\":\"\",\"size\":65535,\"signed\":true,\"required\":false,\"default\":null,\"array\":true,\"filters\":[]},{\"$id\":\"deliveredTotal\",\"type\":\"integer\",\"format\":\"\",\"size\":0,\"signed\":true,\"required\":false,\"default\":0,\"array\":false,\"filters\":[]},{\"$id\":\"search\",\"type\":\"string\",\"format\":\"\",\"size\":16384,\"signed\":true,\"required\":false,\"default\":\"\",\"array\":false,\"filters\":[\"messageSearch\"]}]','[{\"$id\":\"_key_search\",\"type\":\"fulltext\",\"attributes\":[\"search\"],\"lengths\":[],\"orders\":[]}]',1),
(25,'topics','2025-03-21 09:02:57.433','2025-03-21 09:02:57.433','[\"create(\\\"any\\\")\"]','topics','[{\"$id\":\"name\",\"type\":\"string\",\"format\":\"\",\"size\":128,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"subscribe\",\"type\":\"string\",\"format\":\"\",\"size\":128,\"signed\":true,\"required\":false,\"default\":null,\"array\":true,\"filters\":[]},{\"$id\":\"emailTotal\",\"type\":\"integer\",\"format\":\"\",\"size\":0,\"signed\":true,\"required\":false,\"default\":0,\"array\":false,\"filters\":[]},{\"$id\":\"smsTotal\",\"type\":\"integer\",\"format\":\"\",\"size\":0,\"signed\":true,\"required\":false,\"default\":0,\"array\":false,\"filters\":[]},{\"$id\":\"pushTotal\",\"type\":\"integer\",\"format\":\"\",\"size\":0,\"signed\":true,\"required\":false,\"default\":0,\"array\":false,\"filters\":[]},{\"$id\":\"targets\",\"type\":\"string\",\"format\":\"\",\"size\":16384,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"subQueryTopicTargets\"]},{\"$id\":\"search\",\"type\":\"string\",\"format\":\"\",\"size\":16384,\"signed\":true,\"required\":false,\"default\":\"\",\"array\":false,\"filters\":[\"topicSearch\"]}]','[{\"$id\":\"_key_name\",\"type\":\"fulltext\",\"attributes\":[\"name\"],\"lengths\":[],\"orders\":[]},{\"$id\":\"_key_search\",\"type\":\"fulltext\",\"attributes\":[\"search\"],\"lengths\":[],\"orders\":[\"ASC\"]}]',1),
(26,'subscribers','2025-03-21 09:02:57.632','2025-03-21 09:02:57.632','[\"create(\\\"any\\\")\"]','subscribers','[{\"$id\":\"targetId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"targetInternalId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"userId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"userInternalId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"topicId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"topicInternalId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"providerType\",\"type\":\"string\",\"format\":\"\",\"size\":128,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"search\",\"type\":\"string\",\"format\":\"\",\"size\":16384,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]}]','[{\"$id\":\"_key_targetId\",\"type\":\"key\",\"attributes\":[\"targetId\"],\"lengths\":[],\"orders\":[]},{\"$id\":\"_key_targetInternalId\",\"type\":\"key\",\"attributes\":[\"targetInternalId\"],\"lengths\":[],\"orders\":[]},{\"$id\":\"_key_userId\",\"type\":\"key\",\"attributes\":[\"userId\"],\"lengths\":[],\"orders\":[]},{\"$id\":\"_key_userInternalId\",\"type\":\"key\",\"attributes\":[\"userInternalId\"],\"lengths\":[],\"orders\":[]},{\"$id\":\"_key_topicId\",\"type\":\"key\",\"attributes\":[\"topicId\"],\"lengths\":[],\"orders\":[]},{\"$id\":\"_key_topicInternalId\",\"type\":\"key\",\"attributes\":[\"topicInternalId\"],\"lengths\":[],\"orders\":[]},{\"$id\":\"_unique_target_topic\",\"type\":\"unique\",\"attributes\":[\"targetInternalId\",\"topicInternalId\"],\"lengths\":[],\"orders\":[]},{\"$id\":\"_fulltext_search\",\"type\":\"fulltext\",\"attributes\":[\"search\"],\"lengths\":[],\"orders\":[]}]',1),
(27,'targets','2025-03-21 09:02:57.752','2025-03-21 09:02:57.752','[\"create(\\\"any\\\")\"]','targets','[{\"$id\":\"userId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"userInternalId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"sessionId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"sessionInternalId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"providerType\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"providerId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"providerInternalId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"identifier\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"name\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"expired\",\"type\":\"boolean\",\"format\":\"\",\"size\":0,\"signed\":true,\"required\":false,\"default\":false,\"array\":false,\"filters\":[]}]','[{\"$id\":\"_key_userId\",\"type\":\"key\",\"attributes\":[\"userId\"],\"lengths\":[],\"orders\":[\"ASC\"]},{\"$id\":\"_key_userInternalId\",\"type\":\"key\",\"attributes\":[\"userInternalId\"],\"lengths\":[],\"orders\":[\"ASC\"]},{\"$id\":\"_key_providerId\",\"type\":\"key\",\"attributes\":[\"providerId\"],\"lengths\":[],\"orders\":[]},{\"$id\":\"_key_providerInternalId\",\"type\":\"key\",\"attributes\":[\"providerInternalId\"],\"lengths\":[],\"orders\":[]},{\"$id\":\"_key_identifier\",\"type\":\"unique\",\"attributes\":[\"identifier\"],\"lengths\":[],\"orders\":[]}]',1),
(80,'database_27','2025-03-21 10:11:49.473','2025-03-21 10:11:49.473','[\"create(\\\"any\\\")\"]','database_27','[{\"$id\":\"databaseInternalId\",\"type\":\"string\",\"size\":255,\"required\":true,\"signed\":true,\"array\":false,\"filters\":[],\"default\":null,\"format\":\"\"},{\"$id\":\"databaseId\",\"type\":\"string\",\"size\":255,\"required\":true,\"signed\":true,\"array\":false,\"filters\":[],\"default\":null,\"format\":\"\"},{\"$id\":\"name\",\"type\":\"string\",\"size\":256,\"required\":true,\"signed\":true,\"array\":false,\"filters\":[],\"default\":null,\"format\":\"\"},{\"$id\":\"enabled\",\"type\":\"boolean\",\"size\":0,\"required\":true,\"signed\":true,\"array\":false,\"filters\":[],\"default\":null,\"format\":\"\"},{\"$id\":\"documentSecurity\",\"type\":\"boolean\",\"size\":0,\"required\":true,\"signed\":true,\"array\":false,\"filters\":[],\"default\":null,\"format\":\"\"},{\"$id\":\"attributes\",\"type\":\"string\",\"size\":1000000,\"required\":false,\"signed\":true,\"array\":false,\"filters\":[\"subQueryAttributes\"],\"default\":null,\"format\":\"\"},{\"$id\":\"indexes\",\"type\":\"string\",\"size\":1000000,\"required\":false,\"signed\":true,\"array\":false,\"filters\":[\"subQueryIndexes\"],\"default\":null,\"format\":\"\"},{\"$id\":\"search\",\"type\":\"string\",\"size\":16384,\"required\":false,\"signed\":true,\"array\":false,\"filters\":[],\"default\":null,\"format\":\"\"}]','[{\"$id\":\"_fulltext_search\",\"type\":\"fulltext\",\"attributes\":[\"search\"],\"lengths\":[],\"orders\":[]},{\"$id\":\"_key_name\",\"type\":\"key\",\"attributes\":[\"name\"],\"lengths\":[256],\"orders\":[\"ASC\"]},{\"$id\":\"_key_enabled\",\"type\":\"key\",\"attributes\":[\"enabled\"],\"lengths\":[],\"orders\":[\"ASC\"]},{\"$id\":\"_key_documentSecurity\",\"type\":\"key\",\"attributes\":[\"documentSecurity\"],\"lengths\":[],\"orders\":[\"ASC\"]}]',1),
(81,'database_27_collection_1','2025-03-21 10:11:49.767','2025-03-21 10:11:49.767','[\"read(\\\"any\\\")\",\"create(\\\"any\\\")\",\"update(\\\"any\\\")\",\"delete(\\\"any\\\")\"]','database_27_collection_1','[{\"$id\":\"firstName\",\"key\":\"firstName\",\"type\":\"string\",\"size\":255,\"required\":true,\"default\":null,\"signed\":true,\"array\":false,\"format\":\"\",\"formatOptions\":[],\"filters\":[]},{\"$id\":\"lastName\",\"key\":\"lastName\",\"type\":\"string\",\"size\":255,\"required\":true,\"default\":null,\"signed\":true,\"array\":false,\"format\":\"\",\"formatOptions\":[],\"filters\":[]},{\"$id\":\"deleted\",\"key\":\"deleted\",\"type\":\"boolean\",\"size\":0,\"required\":true,\"default\":null,\"signed\":true,\"array\":false,\"format\":\"\",\"formatOptions\":[],\"filters\":[]},{\"$id\":\"age\",\"key\":\"age\",\"type\":\"integer\",\"size\":4,\"required\":true,\"default\":null,\"signed\":true,\"array\":false,\"format\":\"intRange\",\"formatOptions\":{\"min\":0,\"max\":100},\"filters\":[]}]','[]',0);
/*!40000 ALTER TABLE `_2__metadata` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_2__metadata_perms`
--

DROP TABLE IF EXISTS `_2__metadata_perms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_2__metadata_perms` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_type` varchar(12) NOT NULL,
  `_permission` varchar(255) NOT NULL,
  `_document` varchar(255) NOT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_index1` (`_document`,`_type`,`_permission`),
  KEY `_permission` (`_permission`,`_type`)
) ENGINE=InnoDB AUTO_INCREMENT=163 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_2__metadata_perms`
--

LOCK TABLES `_2__metadata_perms` WRITE;
/*!40000 ALTER TABLE `_2__metadata_perms` DISABLE KEYS */;
INSERT INTO `_2__metadata_perms` VALUES
(2,'create','any','abuse'),
(4,'create','any','attributes'),
(1,'create','any','audit'),
(15,'create','any','authenticators'),
(21,'create','any','buckets'),
(8,'create','any','builds'),
(12,'create','any','cache'),
(16,'create','any','challenges'),
(3,'create','any','databases'),
(158,'create','any','database_27'),
(159,'create','any','database_27_collection_1'),
(162,'delete','any','database_27_collection_1'),
(160,'read','any','database_27_collection_1'),
(161,'update','any','database_27_collection_1'),
(7,'create','any','deployments'),
(9,'create','any','executions'),
(6,'create','any','functions'),
(18,'create','any','identities'),
(5,'create','any','indexes'),
(20,'create','any','memberships'),
(24,'create','any','messages'),
(11,'create','any','migrations'),
(23,'create','any','providers'),
(17,'create','any','sessions'),
(22,'create','any','stats'),
(26,'create','any','subscribers'),
(27,'create','any','targets'),
(19,'create','any','teams'),
(14,'create','any','tokens'),
(25,'create','any','topics'),
(13,'create','any','users'),
(10,'create','any','variables');
/*!40000 ALTER TABLE `_2__metadata_perms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_2_abuse`
--

DROP TABLE IF EXISTS `_2_abuse`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_2_abuse` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_uid` varchar(255) NOT NULL,
  `_createdAt` datetime(3) DEFAULT NULL,
  `_updatedAt` datetime(3) DEFAULT NULL,
  `_permissions` mediumtext DEFAULT NULL,
  `key` varchar(255) DEFAULT NULL,
  `time` datetime(3) DEFAULT NULL,
  `count` bigint(20) unsigned DEFAULT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_uid` (`_uid`),
  UNIQUE KEY `unique1` (`key`,`time`),
  KEY `index2` (`time`),
  KEY `_created_at` (`_createdAt`),
  KEY `_updated_at` (`_updatedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_2_abuse`
--

LOCK TABLES `_2_abuse` WRITE;
/*!40000 ALTER TABLE `_2_abuse` DISABLE KEYS */;
/*!40000 ALTER TABLE `_2_abuse` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_2_abuse_perms`
--

DROP TABLE IF EXISTS `_2_abuse_perms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_2_abuse_perms` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_type` varchar(12) NOT NULL,
  `_permission` varchar(255) NOT NULL,
  `_document` varchar(255) NOT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_index1` (`_document`,`_type`,`_permission`),
  KEY `_permission` (`_permission`,`_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_2_abuse_perms`
--

LOCK TABLES `_2_abuse_perms` WRITE;
/*!40000 ALTER TABLE `_2_abuse_perms` DISABLE KEYS */;
/*!40000 ALTER TABLE `_2_abuse_perms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_2_attributes`
--

DROP TABLE IF EXISTS `_2_attributes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_2_attributes` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_uid` varchar(255) NOT NULL,
  `_createdAt` datetime(3) DEFAULT NULL,
  `_updatedAt` datetime(3) DEFAULT NULL,
  `_permissions` mediumtext DEFAULT NULL,
  `databaseInternalId` varchar(255) DEFAULT NULL,
  `databaseId` varchar(255) DEFAULT NULL,
  `collectionInternalId` varchar(255) DEFAULT NULL,
  `collectionId` varchar(255) DEFAULT NULL,
  `key` varchar(255) DEFAULT NULL,
  `type` varchar(256) DEFAULT NULL,
  `status` varchar(16) DEFAULT NULL,
  `error` varchar(2048) DEFAULT NULL,
  `size` int(11) DEFAULT NULL,
  `required` tinyint(1) DEFAULT NULL,
  `default` text DEFAULT NULL,
  `signed` tinyint(1) DEFAULT NULL,
  `array` tinyint(1) DEFAULT NULL,
  `format` varchar(64) DEFAULT NULL,
  `formatOptions` text DEFAULT NULL,
  `filters` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`filters`)),
  `options` text DEFAULT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_uid` (`_uid`),
  KEY `_key_db_collection` (`databaseInternalId`,`collectionInternalId`),
  KEY `_created_at` (`_createdAt`),
  KEY `_updated_at` (`_updatedAt`)
) ENGINE=InnoDB AUTO_INCREMENT=109 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_2_attributes`
--

LOCK TABLES `_2_attributes` WRITE;
/*!40000 ALTER TABLE `_2_attributes` DISABLE KEYS */;
INSERT INTO `_2_attributes` VALUES
(105,'27_1_firstName','2025-03-21 10:11:49.850','2025-03-21 10:11:49.893','[]','27','ci-db-rzhgbxmeyp','1','test-collection-1','firstName','string','available',NULL,255,1,NULL,1,0,'','[]','[]','[]'),
(106,'27_1_lastName','2025-03-21 10:11:49.880','2025-03-21 10:11:49.938','[]','27','ci-db-rzhgbxmeyp','1','test-collection-1','lastName','string','available',NULL,255,1,NULL,1,0,'','[]','[]','[]'),
(107,'27_1_deleted','2025-03-21 10:11:49.925','2025-03-21 10:11:49.975','[]','27','ci-db-rzhgbxmeyp','1','test-collection-1','deleted','boolean','available',NULL,0,1,NULL,1,0,'','[]','[]','[]'),
(108,'27_1_age','2025-03-21 10:11:50.056','2025-03-21 10:11:50.103','[]','27','ci-db-rzhgbxmeyp','1','test-collection-1','age','integer','available',NULL,4,1,NULL,1,0,'intRange','{\"min\":0,\"max\":100}','[]','[]');
/*!40000 ALTER TABLE `_2_attributes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_2_attributes_perms`
--

DROP TABLE IF EXISTS `_2_attributes_perms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_2_attributes_perms` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_type` varchar(12) NOT NULL,
  `_permission` varchar(255) NOT NULL,
  `_document` varchar(255) NOT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_index1` (`_document`,`_type`,`_permission`),
  KEY `_permission` (`_permission`,`_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_2_attributes_perms`
--

LOCK TABLES `_2_attributes_perms` WRITE;
/*!40000 ALTER TABLE `_2_attributes_perms` DISABLE KEYS */;
/*!40000 ALTER TABLE `_2_attributes_perms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_2_audit`
--

DROP TABLE IF EXISTS `_2_audit`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_2_audit` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_uid` varchar(255) NOT NULL,
  `_createdAt` datetime(3) DEFAULT NULL,
  `_updatedAt` datetime(3) DEFAULT NULL,
  `_permissions` mediumtext DEFAULT NULL,
  `userId` varchar(255) DEFAULT NULL,
  `event` varchar(255) DEFAULT NULL,
  `resource` varchar(255) DEFAULT NULL,
  `userAgent` text DEFAULT NULL,
  `ip` varchar(45) DEFAULT NULL,
  `location` varchar(45) DEFAULT NULL,
  `time` datetime(3) DEFAULT NULL,
  `data` longtext DEFAULT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_uid` (`_uid`),
  KEY `index2` (`event`),
  KEY `index4` (`userId`,`event`),
  KEY `index5` (`resource`,`event`),
  KEY `index-time` (`time` DESC),
  KEY `_created_at` (`_createdAt`),
  KEY `_updated_at` (`_updatedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_2_audit`
--

LOCK TABLES `_2_audit` WRITE;
/*!40000 ALTER TABLE `_2_audit` DISABLE KEYS */;
/*!40000 ALTER TABLE `_2_audit` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_2_audit_perms`
--

DROP TABLE IF EXISTS `_2_audit_perms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_2_audit_perms` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_type` varchar(12) NOT NULL,
  `_permission` varchar(255) NOT NULL,
  `_document` varchar(255) NOT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_index1` (`_document`,`_type`,`_permission`),
  KEY `_permission` (`_permission`,`_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_2_audit_perms`
--

LOCK TABLES `_2_audit_perms` WRITE;
/*!40000 ALTER TABLE `_2_audit_perms` DISABLE KEYS */;
/*!40000 ALTER TABLE `_2_audit_perms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_2_authenticators`
--

DROP TABLE IF EXISTS `_2_authenticators`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_2_authenticators` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_uid` varchar(255) NOT NULL,
  `_createdAt` datetime(3) DEFAULT NULL,
  `_updatedAt` datetime(3) DEFAULT NULL,
  `_permissions` mediumtext DEFAULT NULL,
  `userInternalId` varchar(255) DEFAULT NULL,
  `userId` varchar(255) DEFAULT NULL,
  `type` varchar(255) DEFAULT NULL,
  `verified` tinyint(1) DEFAULT NULL,
  `data` text DEFAULT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_uid` (`_uid`),
  KEY `_key_userInternalId` (`userInternalId`),
  KEY `_created_at` (`_createdAt`),
  KEY `_updated_at` (`_updatedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_2_authenticators`
--

LOCK TABLES `_2_authenticators` WRITE;
/*!40000 ALTER TABLE `_2_authenticators` DISABLE KEYS */;
/*!40000 ALTER TABLE `_2_authenticators` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_2_authenticators_perms`
--

DROP TABLE IF EXISTS `_2_authenticators_perms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_2_authenticators_perms` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_type` varchar(12) NOT NULL,
  `_permission` varchar(255) NOT NULL,
  `_document` varchar(255) NOT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_index1` (`_document`,`_type`,`_permission`),
  KEY `_permission` (`_permission`,`_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_2_authenticators_perms`
--

LOCK TABLES `_2_authenticators_perms` WRITE;
/*!40000 ALTER TABLE `_2_authenticators_perms` DISABLE KEYS */;
/*!40000 ALTER TABLE `_2_authenticators_perms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_2_buckets`
--

DROP TABLE IF EXISTS `_2_buckets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_2_buckets` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_uid` varchar(255) NOT NULL,
  `_createdAt` datetime(3) DEFAULT NULL,
  `_updatedAt` datetime(3) DEFAULT NULL,
  `_permissions` mediumtext DEFAULT NULL,
  `enabled` tinyint(1) DEFAULT NULL,
  `name` varchar(128) DEFAULT NULL,
  `fileSecurity` tinyint(1) DEFAULT NULL,
  `maximumFileSize` bigint(20) unsigned DEFAULT NULL,
  `allowedFileExtensions` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`allowedFileExtensions`)),
  `compression` varchar(10) DEFAULT NULL,
  `encryption` tinyint(1) DEFAULT NULL,
  `antivirus` tinyint(1) DEFAULT NULL,
  `search` text DEFAULT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_uid` (`_uid`),
  KEY `_key_enabled` (`enabled`),
  KEY `_key_name` (`name`),
  KEY `_key_fileSecurity` (`fileSecurity`),
  KEY `_key_maximumFileSize` (`maximumFileSize`),
  KEY `_key_encryption` (`encryption`),
  KEY `_key_antivirus` (`antivirus`),
  KEY `_created_at` (`_createdAt`),
  KEY `_updated_at` (`_updatedAt`),
  FULLTEXT KEY `_fulltext_name` (`name`),
  FULLTEXT KEY `_key_search` (`search`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_2_buckets`
--

LOCK TABLES `_2_buckets` WRITE;
/*!40000 ALTER TABLE `_2_buckets` DISABLE KEYS */;
/*!40000 ALTER TABLE `_2_buckets` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_2_buckets_perms`
--

DROP TABLE IF EXISTS `_2_buckets_perms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_2_buckets_perms` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_type` varchar(12) NOT NULL,
  `_permission` varchar(255) NOT NULL,
  `_document` varchar(255) NOT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_index1` (`_document`,`_type`,`_permission`),
  KEY `_permission` (`_permission`,`_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_2_buckets_perms`
--

LOCK TABLES `_2_buckets_perms` WRITE;
/*!40000 ALTER TABLE `_2_buckets_perms` DISABLE KEYS */;
/*!40000 ALTER TABLE `_2_buckets_perms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_2_builds`
--

DROP TABLE IF EXISTS `_2_builds`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_2_builds` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_uid` varchar(255) NOT NULL,
  `_createdAt` datetime(3) DEFAULT NULL,
  `_updatedAt` datetime(3) DEFAULT NULL,
  `_permissions` mediumtext DEFAULT NULL,
  `startTime` datetime(3) DEFAULT NULL,
  `endTime` datetime(3) DEFAULT NULL,
  `duration` int(11) DEFAULT NULL,
  `size` int(11) DEFAULT NULL,
  `deploymentInternalId` varchar(255) DEFAULT NULL,
  `deploymentId` varchar(255) DEFAULT NULL,
  `runtime` varchar(2048) DEFAULT NULL,
  `status` varchar(256) DEFAULT NULL,
  `path` varchar(2048) DEFAULT NULL,
  `logs` mediumtext DEFAULT NULL,
  `sourceType` varchar(2048) DEFAULT NULL,
  `source` varchar(2048) DEFAULT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_uid` (`_uid`),
  KEY `_key_deployment` (`deploymentId`),
  KEY `_created_at` (`_createdAt`),
  KEY `_updated_at` (`_updatedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_2_builds`
--

LOCK TABLES `_2_builds` WRITE;
/*!40000 ALTER TABLE `_2_builds` DISABLE KEYS */;
/*!40000 ALTER TABLE `_2_builds` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_2_builds_perms`
--

DROP TABLE IF EXISTS `_2_builds_perms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_2_builds_perms` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_type` varchar(12) NOT NULL,
  `_permission` varchar(255) NOT NULL,
  `_document` varchar(255) NOT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_index1` (`_document`,`_type`,`_permission`),
  KEY `_permission` (`_permission`,`_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_2_builds_perms`
--

LOCK TABLES `_2_builds_perms` WRITE;
/*!40000 ALTER TABLE `_2_builds_perms` DISABLE KEYS */;
/*!40000 ALTER TABLE `_2_builds_perms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_2_cache`
--

DROP TABLE IF EXISTS `_2_cache`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_2_cache` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_uid` varchar(255) NOT NULL,
  `_createdAt` datetime(3) DEFAULT NULL,
  `_updatedAt` datetime(3) DEFAULT NULL,
  `_permissions` mediumtext DEFAULT NULL,
  `resource` varchar(255) DEFAULT NULL,
  `resourceType` varchar(255) DEFAULT NULL,
  `mimeType` varchar(255) DEFAULT NULL,
  `accessedAt` datetime(3) DEFAULT NULL,
  `signature` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_uid` (`_uid`),
  KEY `_key_accessedAt` (`accessedAt`),
  KEY `_key_resource` (`resource`),
  KEY `_created_at` (`_createdAt`),
  KEY `_updated_at` (`_updatedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_2_cache`
--

LOCK TABLES `_2_cache` WRITE;
/*!40000 ALTER TABLE `_2_cache` DISABLE KEYS */;
/*!40000 ALTER TABLE `_2_cache` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_2_cache_perms`
--

DROP TABLE IF EXISTS `_2_cache_perms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_2_cache_perms` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_type` varchar(12) NOT NULL,
  `_permission` varchar(255) NOT NULL,
  `_document` varchar(255) NOT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_index1` (`_document`,`_type`,`_permission`),
  KEY `_permission` (`_permission`,`_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_2_cache_perms`
--

LOCK TABLES `_2_cache_perms` WRITE;
/*!40000 ALTER TABLE `_2_cache_perms` DISABLE KEYS */;
/*!40000 ALTER TABLE `_2_cache_perms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_2_challenges`
--

DROP TABLE IF EXISTS `_2_challenges`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_2_challenges` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_uid` varchar(255) NOT NULL,
  `_createdAt` datetime(3) DEFAULT NULL,
  `_updatedAt` datetime(3) DEFAULT NULL,
  `_permissions` mediumtext DEFAULT NULL,
  `userInternalId` varchar(255) DEFAULT NULL,
  `userId` varchar(255) DEFAULT NULL,
  `type` varchar(255) DEFAULT NULL,
  `token` varchar(512) DEFAULT NULL,
  `code` varchar(512) DEFAULT NULL,
  `expire` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_uid` (`_uid`),
  KEY `_key_user` (`userInternalId`),
  KEY `_created_at` (`_createdAt`),
  KEY `_updated_at` (`_updatedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_2_challenges`
--

LOCK TABLES `_2_challenges` WRITE;
/*!40000 ALTER TABLE `_2_challenges` DISABLE KEYS */;
/*!40000 ALTER TABLE `_2_challenges` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_2_challenges_perms`
--

DROP TABLE IF EXISTS `_2_challenges_perms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_2_challenges_perms` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_type` varchar(12) NOT NULL,
  `_permission` varchar(255) NOT NULL,
  `_document` varchar(255) NOT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_index1` (`_document`,`_type`,`_permission`),
  KEY `_permission` (`_permission`,`_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_2_challenges_perms`
--

LOCK TABLES `_2_challenges_perms` WRITE;
/*!40000 ALTER TABLE `_2_challenges_perms` DISABLE KEYS */;
/*!40000 ALTER TABLE `_2_challenges_perms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_2_database_27`
--

DROP TABLE IF EXISTS `_2_database_27`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_2_database_27` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_uid` varchar(255) NOT NULL,
  `_createdAt` datetime(3) DEFAULT NULL,
  `_updatedAt` datetime(3) DEFAULT NULL,
  `_permissions` mediumtext DEFAULT NULL,
  `databaseInternalId` varchar(255) DEFAULT NULL,
  `databaseId` varchar(255) DEFAULT NULL,
  `name` varchar(256) DEFAULT NULL,
  `enabled` tinyint(1) DEFAULT NULL,
  `documentSecurity` tinyint(1) DEFAULT NULL,
  `attributes` mediumtext DEFAULT NULL,
  `indexes` mediumtext DEFAULT NULL,
  `search` text DEFAULT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_uid` (`_uid`),
  KEY `_key_name` (`name`),
  KEY `_key_enabled` (`enabled`),
  KEY `_key_documentSecurity` (`documentSecurity`),
  KEY `_created_at` (`_createdAt`),
  KEY `_updated_at` (`_updatedAt`),
  FULLTEXT KEY `_fulltext_search` (`search`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_2_database_27`
--

LOCK TABLES `_2_database_27` WRITE;
/*!40000 ALTER TABLE `_2_database_27` DISABLE KEYS */;
INSERT INTO `_2_database_27` VALUES
(1,'test-collection-1','2025-03-21 10:11:49.671','2025-03-21 10:11:49.671','[\"read(\\\"any\\\")\",\"create(\\\"any\\\")\",\"update(\\\"any\\\")\",\"delete(\\\"any\\\")\"]','27','ci-db-rzhgbxmeyp','test-collection-1',1,0,NULL,NULL,'test-collection-1 test-collection-1');
/*!40000 ALTER TABLE `_2_database_27` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_2_database_27_collection_1`
--

DROP TABLE IF EXISTS `_2_database_27_collection_1`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_2_database_27_collection_1` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_uid` varchar(255) NOT NULL,
  `_createdAt` datetime(3) DEFAULT NULL,
  `_updatedAt` datetime(3) DEFAULT NULL,
  `_permissions` mediumtext DEFAULT NULL,
  `firstName` varchar(255) DEFAULT NULL,
  `lastName` varchar(255) DEFAULT NULL,
  `deleted` tinyint(1) DEFAULT NULL,
  `age` int(11) DEFAULT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_uid` (`_uid`),
  KEY `_created_at` (`_createdAt`),
  KEY `_updated_at` (`_updatedAt`)
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_2_database_27_collection_1`
--

LOCK TABLES `_2_database_27_collection_1` WRITE;
/*!40000 ALTER TABLE `_2_database_27_collection_1` DISABLE KEYS */;
INSERT INTO `_2_database_27_collection_1` VALUES
(21,'1-conflict-nbwglavbij','2025-03-21 10:11:54.831','2025-03-21 10:11:54.920','[]','c2','QJIYvzoG',0,25);
/*!40000 ALTER TABLE `_2_database_27_collection_1` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_2_database_27_collection_1_perms`
--

DROP TABLE IF EXISTS `_2_database_27_collection_1_perms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_2_database_27_collection_1_perms` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_type` varchar(12) NOT NULL,
  `_permission` varchar(255) NOT NULL,
  `_document` varchar(255) NOT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_index1` (`_document`,`_type`,`_permission`),
  KEY `_permission` (`_permission`,`_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_2_database_27_collection_1_perms`
--

LOCK TABLES `_2_database_27_collection_1_perms` WRITE;
/*!40000 ALTER TABLE `_2_database_27_collection_1_perms` DISABLE KEYS */;
/*!40000 ALTER TABLE `_2_database_27_collection_1_perms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_2_database_27_perms`
--

DROP TABLE IF EXISTS `_2_database_27_perms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_2_database_27_perms` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_type` varchar(12) NOT NULL,
  `_permission` varchar(255) NOT NULL,
  `_document` varchar(255) NOT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_index1` (`_document`,`_type`,`_permission`),
  KEY `_permission` (`_permission`,`_type`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_2_database_27_perms`
--

LOCK TABLES `_2_database_27_perms` WRITE;
/*!40000 ALTER TABLE `_2_database_27_perms` DISABLE KEYS */;
INSERT INTO `_2_database_27_perms` VALUES
(1,'create','any','test-collection-1'),
(4,'delete','any','test-collection-1'),
(2,'read','any','test-collection-1'),
(3,'update','any','test-collection-1');
/*!40000 ALTER TABLE `_2_database_27_perms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_2_databases`
--

DROP TABLE IF EXISTS `_2_databases`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_2_databases` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_uid` varchar(255) NOT NULL,
  `_createdAt` datetime(3) DEFAULT NULL,
  `_updatedAt` datetime(3) DEFAULT NULL,
  `_permissions` mediumtext DEFAULT NULL,
  `name` varchar(256) DEFAULT NULL,
  `enabled` tinyint(1) DEFAULT NULL,
  `search` text DEFAULT NULL,
  `originalId` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_uid` (`_uid`),
  KEY `_key_name` (`name`),
  KEY `_created_at` (`_createdAt`),
  KEY `_updated_at` (`_updatedAt`),
  FULLTEXT KEY `_fulltext_search` (`search`)
) ENGINE=InnoDB AUTO_INCREMENT=28 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_2_databases`
--

LOCK TABLES `_2_databases` WRITE;
/*!40000 ALTER TABLE `_2_databases` DISABLE KEYS */;
INSERT INTO `_2_databases` VALUES
(27,'ci-db-rzhgbxmeyp','2025-03-21 10:11:49.287','2025-03-21 10:11:49.287','[]','ci-db-rzhgbxmeyp',1,'ci-db-rzhgbxmeyp ci-db-rzhgbxmeyp',NULL);
/*!40000 ALTER TABLE `_2_databases` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_2_databases_perms`
--

DROP TABLE IF EXISTS `_2_databases_perms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_2_databases_perms` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_type` varchar(12) NOT NULL,
  `_permission` varchar(255) NOT NULL,
  `_document` varchar(255) NOT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_index1` (`_document`,`_type`,`_permission`),
  KEY `_permission` (`_permission`,`_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_2_databases_perms`
--

LOCK TABLES `_2_databases_perms` WRITE;
/*!40000 ALTER TABLE `_2_databases_perms` DISABLE KEYS */;
/*!40000 ALTER TABLE `_2_databases_perms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_2_deployments`
--

DROP TABLE IF EXISTS `_2_deployments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_2_deployments` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_uid` varchar(255) NOT NULL,
  `_createdAt` datetime(3) DEFAULT NULL,
  `_updatedAt` datetime(3) DEFAULT NULL,
  `_permissions` mediumtext DEFAULT NULL,
  `resourceInternalId` varchar(255) DEFAULT NULL,
  `resourceId` varchar(255) DEFAULT NULL,
  `resourceType` varchar(255) DEFAULT NULL,
  `buildInternalId` varchar(255) DEFAULT NULL,
  `buildId` varchar(255) DEFAULT NULL,
  `entrypoint` varchar(2048) DEFAULT NULL,
  `commands` varchar(2048) DEFAULT NULL,
  `path` varchar(2048) DEFAULT NULL,
  `type` varchar(2048) DEFAULT NULL,
  `installationId` varchar(255) DEFAULT NULL,
  `installationInternalId` varchar(255) DEFAULT NULL,
  `providerRepositoryId` varchar(255) DEFAULT NULL,
  `repositoryId` varchar(255) DEFAULT NULL,
  `repositoryInternalId` varchar(255) DEFAULT NULL,
  `providerRepositoryName` varchar(255) DEFAULT NULL,
  `providerRepositoryOwner` varchar(255) DEFAULT NULL,
  `providerRepositoryUrl` varchar(255) DEFAULT NULL,
  `providerCommitHash` varchar(255) DEFAULT NULL,
  `providerCommitAuthorUrl` varchar(255) DEFAULT NULL,
  `providerCommitAuthor` varchar(255) DEFAULT NULL,
  `providerCommitMessage` varchar(255) DEFAULT NULL,
  `providerCommitUrl` varchar(255) DEFAULT NULL,
  `providerBranch` varchar(255) DEFAULT NULL,
  `providerBranchUrl` varchar(255) DEFAULT NULL,
  `providerRootDirectory` varchar(255) DEFAULT NULL,
  `providerCommentId` varchar(2048) DEFAULT NULL,
  `size` int(11) DEFAULT NULL,
  `metadata` text DEFAULT NULL,
  `chunksTotal` int(10) unsigned DEFAULT NULL,
  `chunksUploaded` int(10) unsigned DEFAULT NULL,
  `search` text DEFAULT NULL,
  `activate` tinyint(1) DEFAULT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_uid` (`_uid`),
  KEY `_key_resource` (`resourceId`),
  KEY `_key_resource_type` (`resourceType`),
  KEY `_key_size` (`size`),
  KEY `_key_buildId` (`buildId`),
  KEY `_key_activate` (`activate`),
  KEY `_created_at` (`_createdAt`),
  KEY `_updated_at` (`_updatedAt`),
  FULLTEXT KEY `_key_search` (`search`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_2_deployments`
--

LOCK TABLES `_2_deployments` WRITE;
/*!40000 ALTER TABLE `_2_deployments` DISABLE KEYS */;
/*!40000 ALTER TABLE `_2_deployments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_2_deployments_perms`
--

DROP TABLE IF EXISTS `_2_deployments_perms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_2_deployments_perms` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_type` varchar(12) NOT NULL,
  `_permission` varchar(255) NOT NULL,
  `_document` varchar(255) NOT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_index1` (`_document`,`_type`,`_permission`),
  KEY `_permission` (`_permission`,`_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_2_deployments_perms`
--

LOCK TABLES `_2_deployments_perms` WRITE;
/*!40000 ALTER TABLE `_2_deployments_perms` DISABLE KEYS */;
/*!40000 ALTER TABLE `_2_deployments_perms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_2_executions`
--

DROP TABLE IF EXISTS `_2_executions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_2_executions` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_uid` varchar(255) NOT NULL,
  `_createdAt` datetime(3) DEFAULT NULL,
  `_updatedAt` datetime(3) DEFAULT NULL,
  `_permissions` mediumtext DEFAULT NULL,
  `functionInternalId` varchar(255) DEFAULT NULL,
  `functionId` varchar(255) DEFAULT NULL,
  `deploymentInternalId` varchar(255) DEFAULT NULL,
  `deploymentId` varchar(255) DEFAULT NULL,
  `trigger` varchar(128) DEFAULT NULL,
  `status` varchar(128) DEFAULT NULL,
  `duration` double DEFAULT NULL,
  `errors` mediumtext DEFAULT NULL,
  `logs` mediumtext DEFAULT NULL,
  `requestMethod` varchar(128) DEFAULT NULL,
  `requestPath` varchar(2048) DEFAULT NULL,
  `requestHeaders` text DEFAULT NULL,
  `responseStatusCode` int(11) DEFAULT NULL,
  `responseHeaders` text DEFAULT NULL,
  `search` text DEFAULT NULL,
  `scheduledAt` datetime(3) DEFAULT NULL,
  `scheduleInternalId` varchar(255) DEFAULT NULL,
  `scheduleId` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_uid` (`_uid`),
  KEY `_key_function` (`functionId`),
  KEY `_key_trigger` (`trigger`(32)),
  KEY `_key_status` (`status`(32)),
  KEY `_key_requestMethod` (`requestMethod`),
  KEY `_key_requestPath` (`requestPath`(255)),
  KEY `_key_deployment` (`deploymentId`),
  KEY `_key_responseStatusCode` (`responseStatusCode`),
  KEY `_key_duration` (`duration`),
  KEY `_created_at` (`_createdAt`),
  KEY `_updated_at` (`_updatedAt`),
  FULLTEXT KEY `_fulltext_search` (`search`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_2_executions`
--

LOCK TABLES `_2_executions` WRITE;
/*!40000 ALTER TABLE `_2_executions` DISABLE KEYS */;
/*!40000 ALTER TABLE `_2_executions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_2_executions_perms`
--

DROP TABLE IF EXISTS `_2_executions_perms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_2_executions_perms` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_type` varchar(12) NOT NULL,
  `_permission` varchar(255) NOT NULL,
  `_document` varchar(255) NOT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_index1` (`_document`,`_type`,`_permission`),
  KEY `_permission` (`_permission`,`_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_2_executions_perms`
--

LOCK TABLES `_2_executions_perms` WRITE;
/*!40000 ALTER TABLE `_2_executions_perms` DISABLE KEYS */;
/*!40000 ALTER TABLE `_2_executions_perms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_2_functions`
--

DROP TABLE IF EXISTS `_2_functions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_2_functions` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_uid` varchar(255) NOT NULL,
  `_createdAt` datetime(3) DEFAULT NULL,
  `_updatedAt` datetime(3) DEFAULT NULL,
  `_permissions` mediumtext DEFAULT NULL,
  `execute` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`execute`)),
  `name` varchar(2048) DEFAULT NULL,
  `enabled` tinyint(1) DEFAULT NULL,
  `live` tinyint(1) DEFAULT NULL,
  `installationId` varchar(255) DEFAULT NULL,
  `installationInternalId` varchar(255) DEFAULT NULL,
  `providerRepositoryId` varchar(255) DEFAULT NULL,
  `repositoryId` varchar(255) DEFAULT NULL,
  `repositoryInternalId` varchar(255) DEFAULT NULL,
  `providerBranch` varchar(255) DEFAULT NULL,
  `providerRootDirectory` varchar(255) DEFAULT NULL,
  `providerSilentMode` tinyint(1) DEFAULT NULL,
  `logging` tinyint(1) DEFAULT NULL,
  `runtime` varchar(2048) DEFAULT NULL,
  `deploymentInternalId` varchar(255) DEFAULT NULL,
  `deployment` varchar(255) DEFAULT NULL,
  `vars` text DEFAULT NULL,
  `varsProject` text DEFAULT NULL,
  `events` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`events`)),
  `scheduleInternalId` varchar(255) DEFAULT NULL,
  `scheduleId` varchar(255) DEFAULT NULL,
  `schedule` varchar(128) DEFAULT NULL,
  `timeout` int(11) DEFAULT NULL,
  `search` text DEFAULT NULL,
  `version` varchar(8) DEFAULT NULL,
  `entrypoint` text DEFAULT NULL,
  `commands` text DEFAULT NULL,
  `specification` varchar(128) DEFAULT NULL,
  `scopes` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`scopes`)),
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_uid` (`_uid`),
  KEY `_key_name` (`name`(256)),
  KEY `_key_enabled` (`enabled`),
  KEY `_key_installationId` (`installationId`),
  KEY `_key_installationInternalId` (`installationInternalId`),
  KEY `_key_providerRepositoryId` (`providerRepositoryId`),
  KEY `_key_repositoryId` (`repositoryId`),
  KEY `_key_repositoryInternalId` (`repositoryInternalId`),
  KEY `_key_runtime` (`runtime`(64)),
  KEY `_key_deployment` (`deployment`),
  KEY `_created_at` (`_createdAt`),
  KEY `_updated_at` (`_updatedAt`),
  FULLTEXT KEY `_key_search` (`search`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_2_functions`
--

LOCK TABLES `_2_functions` WRITE;
/*!40000 ALTER TABLE `_2_functions` DISABLE KEYS */;
/*!40000 ALTER TABLE `_2_functions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_2_functions_perms`
--

DROP TABLE IF EXISTS `_2_functions_perms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_2_functions_perms` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_type` varchar(12) NOT NULL,
  `_permission` varchar(255) NOT NULL,
  `_document` varchar(255) NOT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_index1` (`_document`,`_type`,`_permission`),
  KEY `_permission` (`_permission`,`_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_2_functions_perms`
--

LOCK TABLES `_2_functions_perms` WRITE;
/*!40000 ALTER TABLE `_2_functions_perms` DISABLE KEYS */;
/*!40000 ALTER TABLE `_2_functions_perms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_2_identities`
--

DROP TABLE IF EXISTS `_2_identities`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_2_identities` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_uid` varchar(255) NOT NULL,
  `_createdAt` datetime(3) DEFAULT NULL,
  `_updatedAt` datetime(3) DEFAULT NULL,
  `_permissions` mediumtext DEFAULT NULL,
  `userInternalId` varchar(255) DEFAULT NULL,
  `userId` varchar(255) DEFAULT NULL,
  `provider` varchar(128) DEFAULT NULL,
  `providerUid` varchar(2048) DEFAULT NULL,
  `providerEmail` varchar(320) DEFAULT NULL,
  `providerAccessToken` text DEFAULT NULL,
  `providerAccessTokenExpiry` datetime(3) DEFAULT NULL,
  `providerRefreshToken` text DEFAULT NULL,
  `secrets` text DEFAULT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_uid` (`_uid`),
  UNIQUE KEY `_key_userInternalId_provider_providerUid` (`userInternalId`(11),`provider`,`providerUid`(128)),
  UNIQUE KEY `_key_provider_providerUid` (`provider`,`providerUid`(128)),
  KEY `_key_userId` (`userId`),
  KEY `_key_userInternalId` (`userInternalId`),
  KEY `_key_provider` (`provider`),
  KEY `_key_providerUid` (`providerUid`(255)),
  KEY `_key_providerEmail` (`providerEmail`(255)),
  KEY `_key_providerAccessTokenExpiry` (`providerAccessTokenExpiry`),
  KEY `_created_at` (`_createdAt`),
  KEY `_updated_at` (`_updatedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_2_identities`
--

LOCK TABLES `_2_identities` WRITE;
/*!40000 ALTER TABLE `_2_identities` DISABLE KEYS */;
/*!40000 ALTER TABLE `_2_identities` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_2_identities_perms`
--

DROP TABLE IF EXISTS `_2_identities_perms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_2_identities_perms` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_type` varchar(12) NOT NULL,
  `_permission` varchar(255) NOT NULL,
  `_document` varchar(255) NOT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_index1` (`_document`,`_type`,`_permission`),
  KEY `_permission` (`_permission`,`_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_2_identities_perms`
--

LOCK TABLES `_2_identities_perms` WRITE;
/*!40000 ALTER TABLE `_2_identities_perms` DISABLE KEYS */;
/*!40000 ALTER TABLE `_2_identities_perms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_2_indexes`
--

DROP TABLE IF EXISTS `_2_indexes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_2_indexes` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_uid` varchar(255) NOT NULL,
  `_createdAt` datetime(3) DEFAULT NULL,
  `_updatedAt` datetime(3) DEFAULT NULL,
  `_permissions` mediumtext DEFAULT NULL,
  `databaseInternalId` varchar(255) DEFAULT NULL,
  `databaseId` varchar(255) DEFAULT NULL,
  `collectionInternalId` varchar(255) DEFAULT NULL,
  `collectionId` varchar(255) DEFAULT NULL,
  `key` varchar(255) DEFAULT NULL,
  `type` varchar(16) DEFAULT NULL,
  `status` varchar(16) DEFAULT NULL,
  `error` varchar(2048) DEFAULT NULL,
  `attributes` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`attributes`)),
  `lengths` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`lengths`)),
  `orders` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`orders`)),
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_uid` (`_uid`),
  KEY `_key_db_collection` (`databaseInternalId`,`collectionInternalId`),
  KEY `_created_at` (`_createdAt`),
  KEY `_updated_at` (`_updatedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_2_indexes`
--

LOCK TABLES `_2_indexes` WRITE;
/*!40000 ALTER TABLE `_2_indexes` DISABLE KEYS */;
/*!40000 ALTER TABLE `_2_indexes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_2_indexes_perms`
--

DROP TABLE IF EXISTS `_2_indexes_perms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_2_indexes_perms` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_type` varchar(12) NOT NULL,
  `_permission` varchar(255) NOT NULL,
  `_document` varchar(255) NOT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_index1` (`_document`,`_type`,`_permission`),
  KEY `_permission` (`_permission`,`_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_2_indexes_perms`
--

LOCK TABLES `_2_indexes_perms` WRITE;
/*!40000 ALTER TABLE `_2_indexes_perms` DISABLE KEYS */;
/*!40000 ALTER TABLE `_2_indexes_perms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_2_memberships`
--

DROP TABLE IF EXISTS `_2_memberships`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_2_memberships` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_uid` varchar(255) NOT NULL,
  `_createdAt` datetime(3) DEFAULT NULL,
  `_updatedAt` datetime(3) DEFAULT NULL,
  `_permissions` mediumtext DEFAULT NULL,
  `userInternalId` varchar(255) DEFAULT NULL,
  `userId` varchar(255) DEFAULT NULL,
  `teamInternalId` varchar(255) DEFAULT NULL,
  `teamId` varchar(255) DEFAULT NULL,
  `roles` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`roles`)),
  `invited` datetime(3) DEFAULT NULL,
  `joined` datetime(3) DEFAULT NULL,
  `confirm` tinyint(1) DEFAULT NULL,
  `secret` varchar(256) DEFAULT NULL,
  `search` text DEFAULT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_uid` (`_uid`),
  UNIQUE KEY `_key_unique` (`teamInternalId`,`userInternalId`),
  KEY `_key_user` (`userInternalId`),
  KEY `_key_team` (`teamInternalId`),
  KEY `_key_userId` (`userId`),
  KEY `_key_teamId` (`teamId`),
  KEY `_key_invited` (`invited`),
  KEY `_key_joined` (`joined`),
  KEY `_key_confirm` (`confirm`),
  KEY `_created_at` (`_createdAt`),
  KEY `_updated_at` (`_updatedAt`),
  FULLTEXT KEY `_key_search` (`search`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_2_memberships`
--

LOCK TABLES `_2_memberships` WRITE;
/*!40000 ALTER TABLE `_2_memberships` DISABLE KEYS */;
/*!40000 ALTER TABLE `_2_memberships` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_2_memberships_perms`
--

DROP TABLE IF EXISTS `_2_memberships_perms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_2_memberships_perms` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_type` varchar(12) NOT NULL,
  `_permission` varchar(255) NOT NULL,
  `_document` varchar(255) NOT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_index1` (`_document`,`_type`,`_permission`),
  KEY `_permission` (`_permission`,`_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_2_memberships_perms`
--

LOCK TABLES `_2_memberships_perms` WRITE;
/*!40000 ALTER TABLE `_2_memberships_perms` DISABLE KEYS */;
/*!40000 ALTER TABLE `_2_memberships_perms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_2_messages`
--

DROP TABLE IF EXISTS `_2_messages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_2_messages` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_uid` varchar(255) NOT NULL,
  `_createdAt` datetime(3) DEFAULT NULL,
  `_updatedAt` datetime(3) DEFAULT NULL,
  `_permissions` mediumtext DEFAULT NULL,
  `providerType` varchar(255) DEFAULT NULL,
  `status` varchar(255) DEFAULT NULL,
  `data` text DEFAULT NULL,
  `topics` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`topics`)),
  `users` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`users`)),
  `targets` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`targets`)),
  `scheduledAt` datetime(3) DEFAULT NULL,
  `scheduleInternalId` varchar(255) DEFAULT NULL,
  `scheduleId` varchar(255) DEFAULT NULL,
  `deliveredAt` datetime(3) DEFAULT NULL,
  `deliveryErrors` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`deliveryErrors`)),
  `deliveredTotal` int(11) DEFAULT NULL,
  `search` text DEFAULT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_uid` (`_uid`),
  KEY `_created_at` (`_createdAt`),
  KEY `_updated_at` (`_updatedAt`),
  FULLTEXT KEY `_key_search` (`search`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_2_messages`
--

LOCK TABLES `_2_messages` WRITE;
/*!40000 ALTER TABLE `_2_messages` DISABLE KEYS */;
/*!40000 ALTER TABLE `_2_messages` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_2_messages_perms`
--

DROP TABLE IF EXISTS `_2_messages_perms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_2_messages_perms` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_type` varchar(12) NOT NULL,
  `_permission` varchar(255) NOT NULL,
  `_document` varchar(255) NOT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_index1` (`_document`,`_type`,`_permission`),
  KEY `_permission` (`_permission`,`_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_2_messages_perms`
--

LOCK TABLES `_2_messages_perms` WRITE;
/*!40000 ALTER TABLE `_2_messages_perms` DISABLE KEYS */;
/*!40000 ALTER TABLE `_2_messages_perms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_2_migrations`
--

DROP TABLE IF EXISTS `_2_migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_2_migrations` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_uid` varchar(255) NOT NULL,
  `_createdAt` datetime(3) DEFAULT NULL,
  `_updatedAt` datetime(3) DEFAULT NULL,
  `_permissions` mediumtext DEFAULT NULL,
  `status` varchar(255) DEFAULT NULL,
  `stage` varchar(255) DEFAULT NULL,
  `source` varchar(8192) DEFAULT NULL,
  `destination` varchar(255) DEFAULT NULL,
  `credentials` mediumtext DEFAULT NULL,
  `resources` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`resources`)),
  `statusCounters` varchar(3000) DEFAULT NULL,
  `resourceData` mediumtext DEFAULT NULL,
  `errors` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`errors`)),
  `search` text DEFAULT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_uid` (`_uid`),
  KEY `_key_status` (`status`),
  KEY `_key_stage` (`stage`),
  KEY `_key_source` (`source`(255)),
  KEY `_created_at` (`_createdAt`),
  KEY `_updated_at` (`_updatedAt`),
  FULLTEXT KEY `_fulltext_search` (`search`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_2_migrations`
--

LOCK TABLES `_2_migrations` WRITE;
/*!40000 ALTER TABLE `_2_migrations` DISABLE KEYS */;
/*!40000 ALTER TABLE `_2_migrations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_2_migrations_perms`
--

DROP TABLE IF EXISTS `_2_migrations_perms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_2_migrations_perms` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_type` varchar(12) NOT NULL,
  `_permission` varchar(255) NOT NULL,
  `_document` varchar(255) NOT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_index1` (`_document`,`_type`,`_permission`),
  KEY `_permission` (`_permission`,`_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_2_migrations_perms`
--

LOCK TABLES `_2_migrations_perms` WRITE;
/*!40000 ALTER TABLE `_2_migrations_perms` DISABLE KEYS */;
/*!40000 ALTER TABLE `_2_migrations_perms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_2_providers`
--

DROP TABLE IF EXISTS `_2_providers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_2_providers` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_uid` varchar(255) NOT NULL,
  `_createdAt` datetime(3) DEFAULT NULL,
  `_updatedAt` datetime(3) DEFAULT NULL,
  `_permissions` mediumtext DEFAULT NULL,
  `name` varchar(128) DEFAULT NULL,
  `provider` varchar(255) DEFAULT NULL,
  `type` varchar(128) DEFAULT NULL,
  `enabled` tinyint(1) DEFAULT NULL,
  `credentials` text DEFAULT NULL,
  `options` text DEFAULT NULL,
  `search` text DEFAULT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_uid` (`_uid`),
  KEY `_key_provider` (`provider`),
  KEY `_key_type` (`type`),
  KEY `_key_enabled_type` (`enabled`,`type`),
  KEY `_created_at` (`_createdAt`),
  KEY `_updated_at` (`_updatedAt`),
  FULLTEXT KEY `_key_name` (`name`),
  FULLTEXT KEY `_key_search` (`search`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_2_providers`
--

LOCK TABLES `_2_providers` WRITE;
/*!40000 ALTER TABLE `_2_providers` DISABLE KEYS */;
/*!40000 ALTER TABLE `_2_providers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_2_providers_perms`
--

DROP TABLE IF EXISTS `_2_providers_perms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_2_providers_perms` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_type` varchar(12) NOT NULL,
  `_permission` varchar(255) NOT NULL,
  `_document` varchar(255) NOT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_index1` (`_document`,`_type`,`_permission`),
  KEY `_permission` (`_permission`,`_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_2_providers_perms`
--

LOCK TABLES `_2_providers_perms` WRITE;
/*!40000 ALTER TABLE `_2_providers_perms` DISABLE KEYS */;
/*!40000 ALTER TABLE `_2_providers_perms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_2_sessions`
--

DROP TABLE IF EXISTS `_2_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_2_sessions` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_uid` varchar(255) NOT NULL,
  `_createdAt` datetime(3) DEFAULT NULL,
  `_updatedAt` datetime(3) DEFAULT NULL,
  `_permissions` mediumtext DEFAULT NULL,
  `userInternalId` varchar(255) DEFAULT NULL,
  `userId` varchar(255) DEFAULT NULL,
  `provider` varchar(128) DEFAULT NULL,
  `providerUid` varchar(2048) DEFAULT NULL,
  `providerAccessToken` text DEFAULT NULL,
  `providerAccessTokenExpiry` datetime(3) DEFAULT NULL,
  `providerRefreshToken` text DEFAULT NULL,
  `secret` varchar(512) DEFAULT NULL,
  `userAgent` text DEFAULT NULL,
  `ip` varchar(45) DEFAULT NULL,
  `countryCode` varchar(2) DEFAULT NULL,
  `osCode` varchar(256) DEFAULT NULL,
  `osName` varchar(256) DEFAULT NULL,
  `osVersion` varchar(256) DEFAULT NULL,
  `clientType` varchar(256) DEFAULT NULL,
  `clientCode` varchar(256) DEFAULT NULL,
  `clientName` varchar(256) DEFAULT NULL,
  `clientVersion` varchar(256) DEFAULT NULL,
  `clientEngine` varchar(256) DEFAULT NULL,
  `clientEngineVersion` varchar(256) DEFAULT NULL,
  `deviceName` varchar(256) DEFAULT NULL,
  `deviceBrand` varchar(256) DEFAULT NULL,
  `deviceModel` varchar(256) DEFAULT NULL,
  `factors` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`factors`)),
  `expire` datetime(3) DEFAULT NULL,
  `mfaUpdatedAt` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_uid` (`_uid`),
  KEY `_key_provider_providerUid` (`provider`,`providerUid`(128)),
  KEY `_key_user` (`userInternalId`),
  KEY `_created_at` (`_createdAt`),
  KEY `_updated_at` (`_updatedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_2_sessions`
--

LOCK TABLES `_2_sessions` WRITE;
/*!40000 ALTER TABLE `_2_sessions` DISABLE KEYS */;
/*!40000 ALTER TABLE `_2_sessions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_2_sessions_perms`
--

DROP TABLE IF EXISTS `_2_sessions_perms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_2_sessions_perms` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_type` varchar(12) NOT NULL,
  `_permission` varchar(255) NOT NULL,
  `_document` varchar(255) NOT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_index1` (`_document`,`_type`,`_permission`),
  KEY `_permission` (`_permission`,`_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_2_sessions_perms`
--

LOCK TABLES `_2_sessions_perms` WRITE;
/*!40000 ALTER TABLE `_2_sessions_perms` DISABLE KEYS */;
/*!40000 ALTER TABLE `_2_sessions_perms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_2_stats`
--

DROP TABLE IF EXISTS `_2_stats`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_2_stats` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_uid` varchar(255) NOT NULL,
  `_createdAt` datetime(3) DEFAULT NULL,
  `_updatedAt` datetime(3) DEFAULT NULL,
  `_permissions` mediumtext DEFAULT NULL,
  `metric` varchar(255) DEFAULT NULL,
  `region` varchar(255) DEFAULT NULL,
  `value` bigint(20) DEFAULT NULL,
  `time` datetime(3) DEFAULT NULL,
  `period` varchar(4) DEFAULT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_uid` (`_uid`),
  UNIQUE KEY `_key_metric_period_time` (`metric` DESC,`period`,`time`),
  KEY `_key_time` (`time` DESC),
  KEY `_key_period_time` (`period`,`time`),
  KEY `_created_at` (`_createdAt`),
  KEY `_updated_at` (`_updatedAt`)
) ENGINE=InnoDB AUTO_INCREMENT=1563 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_2_stats`
--

LOCK TABLES `_2_stats` WRITE;
/*!40000 ALTER TABLE `_2_stats` DISABLE KEYS */;
INSERT INTO `_2_stats` VALUES
(1,'8d119320a2f44299727bcb9a2c77f1d5','2025-03-21 09:06:44.708','2025-03-21 09:59:50.597','[]','network.requests','default',1323,'2025-03-21 09:00:00.000','1h'),
(2,'d857eea933b2a1f69b3c8edeee4e2ead','2025-03-21 09:06:44.713','2025-03-21 10:11:49.072','[]','network.requests','default',1656,'2025-03-21 00:00:00.000','1d'),
(3,'cb2e77ca591ce00391bdc519b19d1c9d','2025-03-21 09:06:44.716','2025-03-21 10:11:49.090','[]','network.requests','default',1656,NULL,'inf'),
(4,'32b68815ec7b96374c039d005adbf807','2025-03-21 09:06:44.724','2025-03-21 09:59:50.658','[]','network.inbound','default',552442,'2025-03-21 09:00:00.000','1h'),
(5,'9efc4bac84a34e7ad10394e39b7e7891','2025-03-21 09:06:44.731','2025-03-21 10:11:49.126','[]','network.inbound','default',690716,'2025-03-21 00:00:00.000','1d'),
(6,'dd464c3f2219264b190e1ea87ceb2595','2025-03-21 09:06:44.734','2025-03-21 10:11:49.147','[]','network.inbound','default',690716,NULL,'inf'),
(7,'373b75ec0c1aaed2f58f510b44d8d2ae','2025-03-21 09:06:44.737','2025-03-21 09:59:50.719','[]','network.outbound','default',1117121,'2025-03-21 09:00:00.000','1h'),
(8,'8e5be0494c38a1941965ca908cbe09b1','2025-03-21 09:06:44.739','2025-03-21 10:11:49.184','[]','network.outbound','default',1398022,'2025-03-21 00:00:00.000','1d'),
(9,'bb484b186be18594b1610e11ef4d5929','2025-03-21 09:06:44.742','2025-03-21 10:11:49.202','[]','network.outbound','default',1398022,NULL,'inf'),
(10,'90bac83483294bb7af66910c5240ee77','2025-03-21 09:07:30.357','2025-03-21 09:07:30.357','[]','databases','default',1,'2025-03-21 09:00:00.000','1h'),
(11,'c8a5bfc34de9f8ff1f6c9c68d9f005ac','2025-03-21 09:07:30.362','2025-03-21 09:07:30.362','[]','databases','default',1,'2025-03-21 00:00:00.000','1d'),
(12,'832d39b64fa34b0cf0aad82308f4d33b','2025-03-21 09:07:30.365','2025-03-21 09:07:30.365','[]','databases','default',1,NULL,'inf'),
(13,'3e7449923428c751ecffbef8107090a3','2025-03-21 09:07:30.380','2025-03-21 09:07:30.380','[]','1.databases.storage','default',114688,'2025-03-21 09:00:00.000','1h'),
(14,'7917fb2af61463830595d8da797c3d89','2025-03-21 09:07:30.382','2025-03-21 09:59:50.782','[]','databases.storage','default',2523136,'2025-03-21 09:00:00.000','1h'),
(15,'050b8cb62e3f8be26dd66b2b994238a8','2025-03-21 09:07:30.387','2025-03-21 09:07:30.387','[]','1.databases.storage','default',114688,'2025-03-21 00:00:00.000','1d'),
(16,'c039bfb8db741eb45e634df773a3cd76','2025-03-21 09:07:30.389','2025-03-21 10:11:49.252','[]','databases.storage','default',2981888,'2025-03-21 00:00:00.000','1d'),
(17,'dc460fc595a9b2740dfec4631b43c1f0','2025-03-21 09:07:30.396','2025-03-21 09:07:30.396','[]','1.databases.storage','default',114688,NULL,'inf'),
(18,'7a562704abf5a89784d93474e7b5eca8','2025-03-21 09:07:30.399','2025-03-21 10:11:49.297','[]','databases.storage','default',2867200,NULL,'inf'),
(46,'5813ed06f4bf91fd0081e0ebc0fcae7f','2025-03-21 09:07:30.574','2025-03-21 09:59:50.991','[]','collections','default',13,'2025-03-21 09:00:00.000','1h'),
(47,'ab65454f38f646cce05772934b6f4b92','2025-03-21 09:07:30.576','2025-03-21 10:11:49.486','[]','collections','default',17,'2025-03-21 00:00:00.000','1d'),
(48,'830f9b7b9ac01c0a2ec1781e53ea1aaa','2025-03-21 09:07:30.579','2025-03-21 10:11:49.526','[]','collections','default',17,NULL,'inf'),
(49,'4e5a13853d8b400cc758865b2ee9eec3','2025-03-21 09:07:30.584','2025-03-21 09:07:30.584','[]','1.collections','default',1,'2025-03-21 09:00:00.000','1h'),
(50,'b0045a26362ceccbc7078c0187181f03','2025-03-21 09:07:30.588','2025-03-21 09:07:30.588','[]','1.collections','default',1,'2025-03-21 00:00:00.000','1d'),
(51,'978aee75339a12002e9bc32c5cf631fb','2025-03-21 09:07:30.592','2025-03-21 09:07:30.592','[]','1.collections','default',1,NULL,'inf'),
(115,'dcae3b91cf935cae003e498d427cf889','2025-03-21 09:10:15.063','2025-03-21 09:10:15.063','[]','2.collections','default',1,'2025-03-21 09:00:00.000','1h'),
(116,'be1490f8fb7fa5cf82c7f325b9a9789e','2025-03-21 09:10:15.067','2025-03-21 09:10:15.067','[]','2.collections','default',1,'2025-03-21 00:00:00.000','1d'),
(117,'5e9e9466087420a661cce054a968c901','2025-03-21 09:10:15.069','2025-03-21 09:10:15.069','[]','2.collections','default',1,NULL,'inf'),
(118,'f1bfcea955ec069716d235af8e684190','2025-03-21 09:10:15.086','2025-03-21 09:10:15.086','[]','3.databases.storage','default',114688,'2025-03-21 09:00:00.000','1h'),
(122,'79b988679ae467884fc59c0bc3d8a2c2','2025-03-21 09:10:15.111','2025-03-21 09:10:15.111','[]','3.databases.storage','default',114688,'2025-03-21 00:00:00.000','1d'),
(126,'4dfae70e7bcce4435ee621029768dd33','2025-03-21 09:10:15.143','2025-03-21 09:10:15.143','[]','3.databases.storage','default',114688,NULL,'inf'),
(130,'ec73184bc7dd1772fa2fa8197f80d2c0','2025-03-21 09:10:15.162','2025-03-21 09:10:15.162','[]','3.collections','default',1,'2025-03-21 09:00:00.000','1h'),
(131,'0a777d9495852c37741922e20b62498a','2025-03-21 09:10:15.166','2025-03-21 09:10:15.166','[]','3.collections','default',1,'2025-03-21 00:00:00.000','1d'),
(132,'401ef7c8362738cfd811bf3882f783cc','2025-03-21 09:10:15.170','2025-03-21 09:10:15.170','[]','3.collections','default',1,NULL,'inf'),
(187,'4cd2973207303cc4c0212827558a3095','2025-03-21 09:11:33.478','2025-03-21 09:11:33.478','[]','4.databases.storage','default',114688,'2025-03-21 09:00:00.000','1h'),
(191,'76b47a930005ad02a08a058712d17a03','2025-03-21 09:11:33.498','2025-03-21 09:11:33.498','[]','4.databases.storage','default',114688,'2025-03-21 00:00:00.000','1d'),
(195,'d45a5e82226be04635bb88557d321205','2025-03-21 09:11:33.518','2025-03-21 09:11:33.518','[]','4.databases.storage','default',114688,NULL,'inf'),
(199,'e6c71703d8052fb1858aaf1daf516550','2025-03-21 09:11:33.562','2025-03-21 09:11:33.562','[]','4.collections','default',1,'2025-03-21 09:00:00.000','1h'),
(200,'2a47ba835625ea470e2e280f871800c7','2025-03-21 09:11:33.571','2025-03-21 09:11:33.571','[]','4.collections','default',1,'2025-03-21 00:00:00.000','1d'),
(201,'168c74940b71d9d8958d0592b3587fd5','2025-03-21 09:11:33.575','2025-03-21 09:11:33.575','[]','4.collections','default',1,NULL,'inf'),
(238,'8eee1651e3aeb5213134f99fd371af0d','2025-03-21 09:12:52.218','2025-03-21 09:12:52.218','[]','5.collections','default',1,'2025-03-21 09:00:00.000','1h'),
(239,'6e00cf7b6385bb5cbff37908705fb400','2025-03-21 09:12:52.227','2025-03-21 09:12:52.227','[]','5.collections','default',1,'2025-03-21 00:00:00.000','1d'),
(240,'66915033be7884a79b219f733016c124','2025-03-21 09:12:52.355','2025-03-21 09:12:52.355','[]','5.collections','default',1,NULL,'inf'),
(241,'ad1480b7e5e0d436cf032d162b80f65f','2025-03-21 09:12:52.376','2025-03-21 09:12:52.376','[]','6.collections','default',1,'2025-03-21 09:00:00.000','1h'),
(242,'fd694dd54e5a934a38ecf6165bfd8be0','2025-03-21 09:12:52.399','2025-03-21 09:12:52.399','[]','6.collections','default',1,'2025-03-21 00:00:00.000','1d'),
(243,'49405b9ab820ea6f567d2de93f9de2d1','2025-03-21 09:12:52.415','2025-03-21 09:12:52.415','[]','6.collections','default',1,NULL,'inf'),
(271,'72fa3006a5ae949fc9089f7a2c2292f3','2025-03-21 09:16:16.338','2025-03-21 09:16:16.338','[]','7.databases.storage','default',114688,'2025-03-21 09:00:00.000','1h'),
(275,'a442415924fcb081fa7e0a7143576bae','2025-03-21 09:16:16.369','2025-03-21 09:16:16.369','[]','7.databases.storage','default',114688,'2025-03-21 00:00:00.000','1d'),
(279,'7c1a5c81e7d09848fcf411566c66d95b','2025-03-21 09:16:16.394','2025-03-21 09:16:16.394','[]','7.databases.storage','default',114688,NULL,'inf'),
(292,'cd8b9709e9de194a72b5bf1ccced0c86','2025-03-21 09:16:16.484','2025-03-21 09:16:16.484','[]','7.collections','default',1,'2025-03-21 09:00:00.000','1h'),
(293,'fe64d35f23831bfc179e635fc5efdc0b','2025-03-21 09:16:16.486','2025-03-21 09:16:16.486','[]','7.collections','default',1,'2025-03-21 00:00:00.000','1d'),
(294,'c125301a01cbc80fcbe62e333d97d5b4','2025-03-21 09:16:16.490','2025-03-21 09:16:16.490','[]','7.collections','default',1,NULL,'inf'),
(349,'c77cec44edfef03ca5fefb447ca9d95e','2025-03-21 09:28:37.384','2025-03-21 09:28:37.384','[]','8.databases.storage','default',114688,'2025-03-21 09:00:00.000','1h'),
(353,'fd7253e020ec95be666e119bf36928ab','2025-03-21 09:28:37.410','2025-03-21 09:28:37.410','[]','8.databases.storage','default',114688,'2025-03-21 00:00:00.000','1d'),
(357,'74196a905871ffb61725a229852d0dab','2025-03-21 09:28:37.431','2025-03-21 09:28:37.431','[]','8.databases.storage','default',114688,NULL,'inf'),
(361,'e71c58208d6d0bfe95ab3c79911f0667','2025-03-21 09:28:37.461','2025-03-21 09:28:37.461','[]','8.collections','default',1,'2025-03-21 09:00:00.000','1h'),
(362,'9368f33735b601fe16e2f619b5482a92','2025-03-21 09:28:37.470','2025-03-21 09:28:37.470','[]','8.collections','default',1,'2025-03-21 00:00:00.000','1d'),
(363,'5b3a14f210413d42d5fbf33605e2fe5d','2025-03-21 09:28:37.483','2025-03-21 09:28:37.483','[]','8.collections','default',1,NULL,'inf'),
(364,'004130613178fc445ce75941fe8e7e12','2025-03-21 09:28:37.493','2025-03-21 09:59:51.118','[]','documents','default',10,'2025-03-21 09:00:00.000','1h'),
(365,'c37cc0dfdede27264d106c1afdbc0d60','2025-03-21 09:28:37.599','2025-03-21 10:11:49.586','[]','documents','default',14,'2025-03-21 00:00:00.000','1d'),
(366,'569f0bc87e0ce030599495ca6fa15950','2025-03-21 09:28:37.616','2025-03-21 10:11:49.611','[]','documents','default',14,NULL,'inf'),
(367,'f18c13dcf9fa8db65013360d661ada1f','2025-03-21 09:28:37.626','2025-03-21 09:28:37.626','[]','8.documents','default',1,'2025-03-21 09:00:00.000','1h'),
(368,'527b2554cb2059027c15a64584a8ae04','2025-03-21 09:28:37.650','2025-03-21 09:28:37.650','[]','8.documents','default',1,'2025-03-21 00:00:00.000','1d'),
(369,'544bb68109fbb12a1515ab6d2cadf39b','2025-03-21 09:28:37.658','2025-03-21 09:28:37.658','[]','8.documents','default',1,NULL,'inf'),
(370,'caa2ae9dd4655fd0e343d3931cdcf5d4','2025-03-21 09:28:37.661','2025-03-21 09:28:37.661','[]','8.1.documents','default',1,'2025-03-21 09:00:00.000','1h'),
(371,'6b524c3ba88bf97f006b0b35930072a0','2025-03-21 09:28:37.664','2025-03-21 09:28:37.664','[]','8.1.documents','default',1,'2025-03-21 00:00:00.000','1d'),
(372,'eda8e21ae01124148eda58480a9d0bcc','2025-03-21 09:28:37.688','2025-03-21 09:28:37.688','[]','8.1.documents','default',1,NULL,'inf'),
(409,'a79b64a55fd16f5771a47e559821af31','2025-03-21 09:36:39.588','2025-03-21 09:36:39.588','[]','9.collections','default',1,'2025-03-21 09:00:00.000','1h'),
(410,'792ac3bc70f447a7a4ffa8740f717e85','2025-03-21 09:36:39.593','2025-03-21 09:36:39.593','[]','9.collections','default',1,'2025-03-21 00:00:00.000','1d'),
(411,'6e1296b0ccb35571adeae4aa76941648','2025-03-21 09:36:39.597','2025-03-21 09:36:39.597','[]','9.collections','default',1,NULL,'inf'),
(421,'16f4fa221be8bffa7b18ca88120e547e','2025-03-21 09:36:39.657','2025-03-21 09:36:39.657','[]','9.documents','default',1,'2025-03-21 09:00:00.000','1h'),
(422,'9f57bee6d2f51a1643cb501bf1f5859e','2025-03-21 09:36:39.659','2025-03-21 09:36:39.659','[]','9.documents','default',1,'2025-03-21 00:00:00.000','1d'),
(423,'d8ce2baf740fc98ecf69dd526e822024','2025-03-21 09:36:39.662','2025-03-21 09:36:39.662','[]','9.documents','default',1,NULL,'inf'),
(424,'cf449584ed6b51b224d3cfdf4751d0a5','2025-03-21 09:36:39.664','2025-03-21 09:36:39.664','[]','9.1.documents','default',1,'2025-03-21 09:00:00.000','1h'),
(425,'99741157df460825c174418a7bcd172b','2025-03-21 09:36:39.667','2025-03-21 09:36:39.667','[]','9.1.documents','default',1,'2025-03-21 00:00:00.000','1d'),
(426,'3ad77b5168014b769158b953a4b47515','2025-03-21 09:36:39.674','2025-03-21 09:36:39.674','[]','9.1.documents','default',1,NULL,'inf'),
(427,'2066c7023f573d447f7eef7a612e490e','2025-03-21 09:36:39.690','2025-03-21 09:36:39.845','[]','10.databases.storage','default',229376,'2025-03-21 09:00:00.000','1h'),
(431,'8d08c99cf85439e6a12fef253a9ffe56','2025-03-21 09:36:39.718','2025-03-21 09:36:39.892','[]','10.databases.storage','default',229376,'2025-03-21 00:00:00.000','1d'),
(435,'e33b3fd84a77c5860c4b03ed4fa3af76','2025-03-21 09:36:39.756','2025-03-21 09:36:39.933','[]','10.databases.storage','default',229376,NULL,'inf'),
(439,'1311048cd039158253d9cd6901d5e922','2025-03-21 09:36:39.782','2025-03-21 09:36:39.782','[]','10.collections','default',1,'2025-03-21 09:00:00.000','1h'),
(440,'35559322ba4dc25e6a371ad6e7eb3988','2025-03-21 09:36:39.786','2025-03-21 09:36:39.786','[]','10.collections','default',1,'2025-03-21 00:00:00.000','1d'),
(441,'df2a909932062c525557a5901ac8b66a','2025-03-21 09:36:39.790','2025-03-21 09:36:39.790','[]','10.collections','default',1,NULL,'inf'),
(442,'cd6ee769865e0ad1373892ba17818d8d','2025-03-21 09:36:39.799','2025-03-21 09:36:39.799','[]','10.documents','default',1,'2025-03-21 09:00:00.000','1h'),
(443,'fe24531445f19732887d7b06ba0ed826','2025-03-21 09:36:39.804','2025-03-21 09:36:39.804','[]','10.documents','default',1,'2025-03-21 00:00:00.000','1d'),
(444,'94f70245dce8f1c0194a72ce31fb3637','2025-03-21 09:36:39.807','2025-03-21 09:36:39.807','[]','10.documents','default',1,NULL,'inf'),
(445,'35f743ce545ddfd3f08dff2dbbe93203','2025-03-21 09:36:39.811','2025-03-21 09:36:39.811','[]','10.1.documents','default',1,'2025-03-21 09:00:00.000','1h'),
(446,'05abf8fc4dbd99810b254b2eb14f0bac','2025-03-21 09:36:39.815','2025-03-21 09:36:39.815','[]','10.1.documents','default',1,'2025-03-21 00:00:00.000','1d'),
(447,'9a64b795722164782ef2b6fcf15ac406','2025-03-21 09:36:39.817','2025-03-21 09:36:39.817','[]','10.1.documents','default',1,NULL,'inf'),
(448,'92f3320ec4695b481cd3d4e72a297922','2025-03-21 09:36:39.823','2025-03-21 09:36:39.823','[]','10.1.databases.storage','default',114688,'2025-03-21 09:00:00.000','1h'),
(455,'61ca74b1c38674003bad05c7e16684b1','2025-03-21 09:36:39.877','2025-03-21 09:36:39.877','[]','10.1.databases.storage','default',114688,'2025-03-21 00:00:00.000','1d'),
(462,'a0ca6a729d1e68f3fa8e0eafd94c35f3','2025-03-21 09:36:39.916','2025-03-21 09:36:39.916','[]','10.1.databases.storage','default',114688,NULL,'inf'),
(523,'c865549bdd073cfdeadea0cdd739cb8a','2025-03-21 09:40:48.871','2025-03-21 09:40:48.871','[]','11.databases.storage','default',114688,'2025-03-21 09:00:00.000','1h'),
(527,'69f20d48e528b6c3d227e09609c79eb2','2025-03-21 09:40:48.893','2025-03-21 09:40:48.893','[]','11.databases.storage','default',114688,'2025-03-21 00:00:00.000','1d'),
(531,'0744a46b2520a509ec0f4c5c6841ff21','2025-03-21 09:40:48.916','2025-03-21 09:40:48.916','[]','11.databases.storage','default',114688,NULL,'inf'),
(535,'c22e94232d5cc9776f8074f77349633b','2025-03-21 09:40:48.934','2025-03-21 09:40:48.934','[]','11.collections','default',1,'2025-03-21 09:00:00.000','1h'),
(536,'848c7d1734fda340707ff6e1e7e85597','2025-03-21 09:40:48.937','2025-03-21 09:40:48.937','[]','11.collections','default',1,'2025-03-21 00:00:00.000','1d'),
(537,'a72b0dd1a4f8a1123ed997ad9eee0e1e','2025-03-21 09:40:48.940','2025-03-21 09:40:48.940','[]','11.collections','default',1,NULL,'inf'),
(538,'e72282ebb3b21a6e6818fdeb0ff1f07f','2025-03-21 09:40:48.942','2025-03-21 09:40:48.942','[]','11.documents','default',1,'2025-03-21 09:00:00.000','1h'),
(539,'eb3cdbedae47f20eb4a29c7b061cd092','2025-03-21 09:40:48.951','2025-03-21 09:40:48.951','[]','11.documents','default',1,'2025-03-21 00:00:00.000','1d'),
(540,'0a966170a32882fa539d1350c7fe4539','2025-03-21 09:40:48.954','2025-03-21 09:40:48.954','[]','11.documents','default',1,NULL,'inf'),
(541,'cc7af746dbbff257f0afa2249fc49f69','2025-03-21 09:40:48.967','2025-03-21 09:40:48.967','[]','11.1.documents','default',1,'2025-03-21 09:00:00.000','1h'),
(542,'f1cdc5a054d5f1b95792e7938041311c','2025-03-21 09:40:48.976','2025-03-21 09:40:48.976','[]','11.1.documents','default',1,'2025-03-21 00:00:00.000','1d'),
(543,'5809ee4b87d503a1dd7ded8dd549686c','2025-03-21 09:40:48.983','2025-03-21 09:40:48.983','[]','11.1.documents','default',1,NULL,'inf'),
(580,'19b81e3c17d9231f1ff4e30e192cb0de','2025-03-21 09:41:28.581','2025-03-21 09:41:28.581','[]','12.collections','default',1,'2025-03-21 09:00:00.000','1h'),
(581,'c7d1e829d803cc934abf0f48bc150c2a','2025-03-21 09:41:28.584','2025-03-21 09:41:28.584','[]','12.collections','default',1,'2025-03-21 00:00:00.000','1d'),
(582,'18a2fb1976b4eaaed0ef723608744744','2025-03-21 09:41:28.587','2025-03-21 09:41:28.587','[]','12.collections','default',1,NULL,'inf'),
(592,'46ffd4111740f4321c06107d965b2771','2025-03-21 09:41:28.654','2025-03-21 09:41:28.654','[]','12.documents','default',1,'2025-03-21 09:00:00.000','1h'),
(593,'14a8f0032bba1c378195e1863d3e5bb5','2025-03-21 09:41:28.659','2025-03-21 09:41:28.659','[]','12.documents','default',1,'2025-03-21 00:00:00.000','1d'),
(594,'21921cc2f267d9552a9143d47f29f5bc','2025-03-21 09:41:28.667','2025-03-21 09:41:28.667','[]','12.documents','default',1,NULL,'inf'),
(595,'2064d433d0af54c8ee0ea4419897f83b','2025-03-21 09:41:28.670','2025-03-21 09:41:28.670','[]','12.1.documents','default',1,'2025-03-21 09:00:00.000','1h'),
(596,'39c839599f399aa7fadb5daadbd2607b','2025-03-21 09:41:28.674','2025-03-21 09:41:28.674','[]','12.1.documents','default',1,'2025-03-21 00:00:00.000','1d'),
(597,'acb07928432eee577d64d9fe996063c1','2025-03-21 09:41:28.677','2025-03-21 09:41:28.677','[]','12.1.documents','default',1,NULL,'inf'),
(598,'12a7712dd21b5ca6954899a45babe273','2025-03-21 09:41:28.691','2025-03-21 09:41:28.820','[]','13.databases.storage','default',229376,'2025-03-21 09:00:00.000','1h'),
(602,'c15c308dcb5e9164422aa051a111e5b9','2025-03-21 09:41:28.725','2025-03-21 09:41:28.873','[]','13.databases.storage','default',229376,'2025-03-21 00:00:00.000','1d'),
(606,'708d8bdbfb0b3ab7275161d5336c0191','2025-03-21 09:41:28.754','2025-03-21 09:41:28.924','[]','13.databases.storage','default',229376,NULL,'inf'),
(610,'b97d54654e40f4756b93dd29a6843f28','2025-03-21 09:41:28.773','2025-03-21 09:41:28.773','[]','13.collections','default',1,'2025-03-21 09:00:00.000','1h'),
(611,'b6f4edde48726888577714f8f930abad','2025-03-21 09:41:28.779','2025-03-21 09:41:28.779','[]','13.collections','default',1,'2025-03-21 00:00:00.000','1d'),
(612,'1f2a5f47df8acffbedae534ce865f567','2025-03-21 09:41:28.782','2025-03-21 09:41:28.782','[]','13.collections','default',1,NULL,'inf'),
(613,'6e515ffcd6cd0f4291713f752d169570','2025-03-21 09:41:28.784','2025-03-21 09:41:28.784','[]','13.documents','default',1,'2025-03-21 09:00:00.000','1h'),
(614,'dafa8efe86c2e0b7f0b9fe2bdf3c157b','2025-03-21 09:41:28.787','2025-03-21 09:41:28.787','[]','13.documents','default',1,'2025-03-21 00:00:00.000','1d'),
(615,'1282c4951c9c6a4e9c3c8ac6c96707f8','2025-03-21 09:41:28.788','2025-03-21 09:41:28.788','[]','13.documents','default',1,NULL,'inf'),
(616,'f306da5f26969075f576a237398a85da','2025-03-21 09:41:28.791','2025-03-21 09:41:28.791','[]','13.1.documents','default',1,'2025-03-21 09:00:00.000','1h'),
(617,'6702e3f75eaa2cf572ff5ff0aa38d991','2025-03-21 09:41:28.793','2025-03-21 09:41:28.793','[]','13.1.documents','default',1,'2025-03-21 00:00:00.000','1d'),
(618,'1c27a98f399bfbe6c526320b4aa2ee92','2025-03-21 09:41:28.799','2025-03-21 09:41:28.799','[]','13.1.documents','default',1,NULL,'inf'),
(619,'58b29743dce5fdd28d184453c46ceb34','2025-03-21 09:41:28.804','2025-03-21 09:41:28.804','[]','13.1.databases.storage','default',114688,'2025-03-21 09:00:00.000','1h'),
(626,'c47c9598cd0aa7972c2a40f2f0f6ce53','2025-03-21 09:41:28.851','2025-03-21 09:41:28.851','[]','13.1.databases.storage','default',114688,'2025-03-21 00:00:00.000','1d'),
(633,'d87d4e5c49e11fd9944c4eba6ef0ff45','2025-03-21 09:41:28.901','2025-03-21 09:41:28.901','[]','13.1.databases.storage','default',114688,NULL,'inf'),
(694,'89ca09b461b625b3fe834e2d56b2053a','2025-03-21 09:42:36.320','2025-03-21 09:42:36.493','[]','14.databases.storage','default',229376,'2025-03-21 09:00:00.000','1h'),
(698,'2f14002a03d615dbaf7b5897387816f1','2025-03-21 09:42:36.350','2025-03-21 09:42:36.539','[]','14.databases.storage','default',229376,'2025-03-21 00:00:00.000','1d'),
(702,'83ef051cc9915ccb46c822cf52147a3e','2025-03-21 09:42:36.387','2025-03-21 09:42:36.591','[]','14.databases.storage','default',229376,NULL,'inf'),
(706,'a6be24dc93ffa369cd570d8f782176d4','2025-03-21 09:42:36.409','2025-03-21 09:42:36.409','[]','14.collections','default',1,'2025-03-21 09:00:00.000','1h'),
(707,'4fa8736bd0455a141cdaf2a9bae58ad4','2025-03-21 09:42:36.412','2025-03-21 09:42:36.412','[]','14.collections','default',1,'2025-03-21 00:00:00.000','1d'),
(708,'4bf19231415d95d4f2643ccc3065a436','2025-03-21 09:42:36.414','2025-03-21 09:42:36.414','[]','14.collections','default',1,NULL,'inf'),
(709,'8a0eaba2972ecea86be4b11b3a01c335','2025-03-21 09:42:36.417','2025-03-21 09:42:36.417','[]','14.documents','default',1,'2025-03-21 09:00:00.000','1h'),
(710,'31511407642f5d93cd237d62a61c541e','2025-03-21 09:42:36.426','2025-03-21 09:42:36.426','[]','14.documents','default',1,'2025-03-21 00:00:00.000','1d'),
(711,'3bd2fef2b5c80bd1a9c98246721bd2db','2025-03-21 09:42:36.429','2025-03-21 09:42:36.429','[]','14.documents','default',1,NULL,'inf'),
(712,'096f6137967b7615ac8c285760a875ea','2025-03-21 09:42:36.446','2025-03-21 09:42:36.446','[]','14.1.documents','default',1,'2025-03-21 09:00:00.000','1h'),
(713,'78ca92c496a700576350db6c1538f23b','2025-03-21 09:42:36.456','2025-03-21 09:42:36.456','[]','14.1.documents','default',1,'2025-03-21 00:00:00.000','1d'),
(714,'74ff898d4f5e6234e6295dd825f245d0','2025-03-21 09:42:36.460','2025-03-21 09:42:36.460','[]','14.1.documents','default',1,NULL,'inf'),
(715,'621291e5f7a6adda759581b11160012e','2025-03-21 09:42:36.468','2025-03-21 09:42:36.468','[]','14.1.databases.storage','default',114688,'2025-03-21 09:00:00.000','1h'),
(722,'a4f59dfafffe2756c6f72ea831da288d','2025-03-21 09:42:36.521','2025-03-21 09:42:36.521','[]','14.1.databases.storage','default',114688,'2025-03-21 00:00:00.000','1d'),
(729,'97ac59052e7478d9c9e9a943ff9a2bc1','2025-03-21 09:42:36.574','2025-03-21 09:42:36.574','[]','14.1.databases.storage','default',114688,NULL,'inf'),
(772,'87f334e94994e69e8d813a16fd36048c','2025-03-21 09:43:09.246','2025-03-21 09:43:09.246','[]','15.databases.storage','default',114688,'2025-03-21 09:00:00.000','1h'),
(776,'1ca5088ddc8676c1522b3a1cc6e70ac1','2025-03-21 09:43:09.275','2025-03-21 09:43:09.275','[]','15.databases.storage','default',114688,'2025-03-21 00:00:00.000','1d'),
(780,'1a3467943d2cbe28da65594269e2e98b','2025-03-21 09:43:09.304','2025-03-21 09:43:09.304','[]','15.databases.storage','default',114688,NULL,'inf'),
(784,'2cae561f3b8a76bb5800d8dfa80646c9','2025-03-21 09:43:09.322','2025-03-21 09:43:09.322','[]','15.collections','default',1,'2025-03-21 09:00:00.000','1h'),
(785,'e569d812102a6e0c7954c8a314b47a4c','2025-03-21 09:43:09.324','2025-03-21 09:43:09.324','[]','15.collections','default',1,'2025-03-21 00:00:00.000','1d'),
(786,'3cec699eefc1efee89b418a4251384b7','2025-03-21 09:43:09.327','2025-03-21 09:43:09.327','[]','15.collections','default',1,NULL,'inf'),
(823,'54dd8f3b811d5646c161c731eeebc94f','2025-03-21 09:43:42.823','2025-03-21 09:43:42.823','[]','15.documents','default',1,'2025-03-21 09:00:00.000','1h'),
(824,'7271aee763c73200e989f6449cf742a2','2025-03-21 09:43:42.825','2025-03-21 09:43:42.825','[]','15.documents','default',1,'2025-03-21 00:00:00.000','1d'),
(825,'83e09d0f0a2c4897eca58aaf83a894de','2025-03-21 09:43:42.832','2025-03-21 09:43:42.832','[]','15.documents','default',1,NULL,'inf'),
(826,'7523613d3a39f610f2fbca72e264d5e5','2025-03-21 09:43:42.834','2025-03-21 09:43:42.834','[]','15.1.documents','default',1,'2025-03-21 09:00:00.000','1h'),
(827,'86eba05095055d914e2e24b8c270f5d3','2025-03-21 09:43:42.836','2025-03-21 09:43:42.836','[]','15.1.documents','default',1,'2025-03-21 00:00:00.000','1d'),
(828,'c5d9c8f344743394baf7a174aff3fbad','2025-03-21 09:43:42.839','2025-03-21 09:43:42.839','[]','15.1.documents','default',1,NULL,'inf'),
(829,'667dafe848e7df9da84bfc4396549fd7','2025-03-21 09:43:42.849','2025-03-21 09:53:51.859','[]','16.databases.storage','default',229376,'2025-03-21 09:00:00.000','1h'),
(833,'03e3a2a7bd18034bcbd497b57e8f2b9b','2025-03-21 09:43:42.878','2025-03-21 09:53:51.899','[]','16.databases.storage','default',229376,'2025-03-21 00:00:00.000','1d'),
(837,'fee82597af586432daf53396bf9c3b6e','2025-03-21 09:43:42.904','2025-03-21 09:53:51.949','[]','16.databases.storage','default',229376,NULL,'inf'),
(841,'a5a74d84faee94ae18ef5c2ff50d4820','2025-03-21 09:43:42.922','2025-03-21 09:43:42.922','[]','16.collections','default',1,'2025-03-21 09:00:00.000','1h'),
(842,'c35d95c517c88c8c93969a9f5edeac08','2025-03-21 09:43:42.924','2025-03-21 09:43:42.924','[]','16.collections','default',1,'2025-03-21 00:00:00.000','1d'),
(843,'19e458e07c5063b047a589cda9826cb1','2025-03-21 09:43:42.926','2025-03-21 09:43:42.926','[]','16.collections','default',1,NULL,'inf'),
(880,'1bdded930ac2e9275ad24d5e284791f6','2025-03-21 09:53:51.817','2025-03-21 09:53:51.817','[]','16.documents','default',1,'2025-03-21 09:00:00.000','1h'),
(881,'7a8f152d1dd9d2d3650f62ae06513908','2025-03-21 09:53:51.820','2025-03-21 09:53:51.820','[]','16.documents','default',1,'2025-03-21 00:00:00.000','1d'),
(882,'51ba14f092e7b0f5c53e9d2d34260e3b','2025-03-21 09:53:51.824','2025-03-21 09:53:51.824','[]','16.documents','default',1,NULL,'inf'),
(883,'b379fa03b4931b2c8290544c0c0aae16','2025-03-21 09:53:51.828','2025-03-21 09:53:51.828','[]','16.1.documents','default',1,'2025-03-21 09:00:00.000','1h'),
(884,'cdf6f1be5881c87b57b70fe8bb814f5e','2025-03-21 09:53:51.830','2025-03-21 09:53:51.830','[]','16.1.documents','default',1,'2025-03-21 00:00:00.000','1d'),
(885,'d9f560ef5cf422b7d16d1b227a232936','2025-03-21 09:53:51.833','2025-03-21 09:53:51.833','[]','16.1.documents','default',1,NULL,'inf'),
(886,'daf2da26c055cf17195252045cbacb66','2025-03-21 09:53:51.837','2025-03-21 09:53:51.837','[]','16.1.databases.storage','default',114688,'2025-03-21 09:00:00.000','1h'),
(893,'597e63f5fef7fcae831f324b2795e018','2025-03-21 09:53:51.880','2025-03-21 09:53:51.880','[]','16.1.databases.storage','default',114688,'2025-03-21 00:00:00.000','1d'),
(900,'4b367137ca7f21a60b8b4ff8afc41d39','2025-03-21 09:53:51.927','2025-03-21 09:53:51.927','[]','16.1.databases.storage','default',114688,NULL,'inf'),
(934,'fcc362b9f395169b49349b0e956b7c30','2025-03-21 09:54:53.775','2025-03-21 09:54:53.876','[]','17.databases.storage','default',229376,'2025-03-21 09:00:00.000','1h'),
(938,'e57466579f3343cbe6992611c6db077a','2025-03-21 09:54:53.793','2025-03-21 09:54:53.915','[]','17.databases.storage','default',229376,'2025-03-21 00:00:00.000','1d'),
(942,'f74872300d9819df31f7b39e22aa316a','2025-03-21 09:54:53.818','2025-03-21 09:54:53.955','[]','17.databases.storage','default',229376,NULL,'inf'),
(946,'a1be1c2bc5a703e5e6ce06664594ff06','2025-03-21 09:54:53.835','2025-03-21 09:54:53.835','[]','17.collections','default',1,'2025-03-21 09:00:00.000','1h'),
(947,'256db368985324518c882e41137515ff','2025-03-21 09:54:53.837','2025-03-21 09:54:53.837','[]','17.collections','default',1,'2025-03-21 00:00:00.000','1d'),
(948,'0cfc60cfbe66da663c070057929a6567','2025-03-21 09:54:53.844','2025-03-21 09:54:53.844','[]','17.collections','default',1,NULL,'inf'),
(949,'667f9c873bb1ec809cc256663422ed5b','2025-03-21 09:54:53.846','2025-03-21 09:54:53.846','[]','17.documents','default',1,'2025-03-21 09:00:00.000','1h'),
(950,'8672583d508fca6c950ce8493749cbff','2025-03-21 09:54:53.848','2025-03-21 09:54:53.848','[]','17.documents','default',1,'2025-03-21 00:00:00.000','1d'),
(951,'903366816e82374e435b8b4a194abb06','2025-03-21 09:54:53.850','2025-03-21 09:54:53.850','[]','17.documents','default',1,NULL,'inf'),
(952,'bca9b62a0f92705a968c838b0aae8f41','2025-03-21 09:54:53.853','2025-03-21 09:54:53.853','[]','17.1.documents','default',1,'2025-03-21 09:00:00.000','1h'),
(953,'00553937a017ef0a17c4caa5801a8511','2025-03-21 09:54:53.855','2025-03-21 09:54:53.855','[]','17.1.documents','default',1,'2025-03-21 00:00:00.000','1d'),
(954,'e75551cb69a49719d3cc7e2c6070c774','2025-03-21 09:54:53.857','2025-03-21 09:54:53.857','[]','17.1.documents','default',1,NULL,'inf'),
(955,'e313566853a4ae407f9297d88a029dd8','2025-03-21 09:54:53.859','2025-03-21 09:54:53.859','[]','17.1.databases.storage','default',114688,'2025-03-21 09:00:00.000','1h'),
(962,'cea7b522be8db2b8528e5c47e9769133','2025-03-21 09:54:53.898','2025-03-21 09:54:53.898','[]','17.1.databases.storage','default',114688,'2025-03-21 00:00:00.000','1d'),
(969,'0bf2b23063c02291065d83ed78bd0f04','2025-03-21 09:54:53.940','2025-03-21 09:54:53.940','[]','17.1.databases.storage','default',114688,NULL,'inf'),
(1030,'0269d1b1818700e8bcd94218355bcd49','2025-03-21 09:56:55.997','2025-03-21 09:56:55.997','[]','18.databases.storage','default',114688,'2025-03-21 09:00:00.000','1h'),
(1034,'206117acdfe25518f20ef913e5b329e1','2025-03-21 09:56:56.021','2025-03-21 09:56:56.021','[]','18.databases.storage','default',114688,'2025-03-21 00:00:00.000','1d'),
(1038,'d5d19070a939d414d56a5635608ce5d5','2025-03-21 09:56:56.041','2025-03-21 09:56:56.041','[]','18.databases.storage','default',114688,NULL,'inf'),
(1042,'20b661984bb95d72b09fd4a2634b0167','2025-03-21 09:56:56.065','2025-03-21 09:56:56.065','[]','18.collections','default',1,'2025-03-21 09:00:00.000','1h'),
(1043,'8704bb638ef8ca15b88cc10e28d4b841','2025-03-21 09:56:56.068','2025-03-21 09:56:56.068','[]','18.collections','default',1,'2025-03-21 00:00:00.000','1d'),
(1044,'6c75b3785eab9360746a182b74a765f2','2025-03-21 09:56:56.072','2025-03-21 09:56:56.072','[]','18.collections','default',1,NULL,'inf'),
(1045,'69c01cf97b89f02f6988da42c31d1dab','2025-03-21 09:56:56.074','2025-03-21 09:56:56.074','[]','18.documents','default',1,'2025-03-21 09:00:00.000','1h'),
(1046,'9f6fb0ea624f15a264be1877e540112a','2025-03-21 09:56:56.084','2025-03-21 09:56:56.084','[]','18.documents','default',1,'2025-03-21 00:00:00.000','1d'),
(1047,'be92ba7db46d2c302233ceb79bd3b3b6','2025-03-21 09:56:56.086','2025-03-21 09:56:56.086','[]','18.documents','default',1,NULL,'inf'),
(1048,'33033f86b2b3b68aa1290aee28494c36','2025-03-21 09:56:56.089','2025-03-21 09:56:56.089','[]','18.1.documents','default',1,'2025-03-21 09:00:00.000','1h'),
(1049,'176534429bd7a56cabce6270b6c248fd','2025-03-21 09:56:56.092','2025-03-21 09:56:56.092','[]','18.1.documents','default',1,'2025-03-21 00:00:00.000','1d'),
(1050,'52193af57d87f42a35a79782b71d7b39','2025-03-21 09:56:56.113','2025-03-21 09:56:56.113','[]','18.1.documents','default',1,NULL,'inf'),
(1078,'d60d56a95ba96265d8ca0de45dd3e339','2025-03-21 09:57:36.664','2025-03-21 09:57:36.664','[]','19.databases.storage','default',114688,'2025-03-21 09:00:00.000','1h'),
(1082,'aca7da2496254b1f6b0997f486c72c96','2025-03-21 09:57:36.691','2025-03-21 09:57:36.691','[]','19.databases.storage','default',114688,'2025-03-21 00:00:00.000','1d'),
(1086,'1ddb21c68bcb6543d82e1faa6f0745e9','2025-03-21 09:57:36.713','2025-03-21 09:57:36.713','[]','19.databases.storage','default',114688,NULL,'inf'),
(1099,'3a6f345210e005edf23db0d14c3ed1b8','2025-03-21 09:57:36.965','2025-03-21 09:57:36.965','[]','19.collections','default',1,'2025-03-21 09:00:00.000','1h'),
(1100,'3143d246b348ddfab03853acb629bb28','2025-03-21 09:57:36.974','2025-03-21 09:57:36.974','[]','19.collections','default',1,'2025-03-21 00:00:00.000','1d'),
(1101,'6d1816db180451b74f7b370d8431b783','2025-03-21 09:57:36.977','2025-03-21 09:57:36.977','[]','19.collections','default',1,NULL,'inf'),
(1111,'d964577d64f0f585498e287525acef40','2025-03-21 09:57:37.037','2025-03-21 09:57:37.037','[]','19.documents','default',1,'2025-03-21 09:00:00.000','1h'),
(1112,'73e6e59f3a6d7af9006f046beb602d21','2025-03-21 09:57:37.044','2025-03-21 09:57:37.044','[]','19.documents','default',1,'2025-03-21 00:00:00.000','1d'),
(1113,'394ad3079bd618066c3d4d6263121c7c','2025-03-21 09:57:37.046','2025-03-21 09:57:37.046','[]','19.documents','default',1,NULL,'inf'),
(1114,'711abb994edd3207dbeeb90f2e581896','2025-03-21 09:57:37.049','2025-03-21 09:57:37.049','[]','19.1.documents','default',1,'2025-03-21 09:00:00.000','1h'),
(1115,'628948a36afe9bbb72b6dc2026506344','2025-03-21 09:57:37.052','2025-03-21 09:57:37.052','[]','19.1.documents','default',1,'2025-03-21 00:00:00.000','1d'),
(1116,'77badac3eb55c9b36affab789dc34d2f','2025-03-21 09:57:37.055','2025-03-21 09:57:37.055','[]','19.1.documents','default',1,NULL,'inf'),
(1144,'46b4cb7f2509ac5ac763e5b95157d11f','2025-03-21 09:58:18.970','2025-03-21 09:58:18.970','[]','20.databases.storage','default',114688,'2025-03-21 09:00:00.000','1h'),
(1148,'b5e660cf16cf081a4a356abd7b0c5eaf','2025-03-21 09:58:18.990','2025-03-21 09:58:18.990','[]','20.databases.storage','default',114688,'2025-03-21 00:00:00.000','1d'),
(1152,'28849b17a29ee315b035a03c20a8bad9','2025-03-21 09:58:19.015','2025-03-21 09:58:19.015','[]','20.databases.storage','default',114688,NULL,'inf'),
(1165,'574d3269cfe12de8a95b13713d7c81a5','2025-03-21 09:58:19.259','2025-03-21 09:58:19.259','[]','20.collections','default',1,'2025-03-21 09:00:00.000','1h'),
(1166,'a1b28681777388c909260923820b2239','2025-03-21 09:58:19.262','2025-03-21 09:58:19.262','[]','20.collections','default',1,'2025-03-21 00:00:00.000','1d'),
(1167,'1104a844e6371a8fdd8f9680408dfedf','2025-03-21 09:58:19.288','2025-03-21 09:58:19.288','[]','20.collections','default',1,NULL,'inf'),
(1177,'928436f1612ecdafce5bbf842b2fae4e','2025-03-21 09:58:19.355','2025-03-21 09:58:19.355','[]','20.documents','default',1,'2025-03-21 09:00:00.000','1h'),
(1178,'36c46b7df3c601bc2808b91e69010e1f','2025-03-21 09:58:19.360','2025-03-21 09:58:19.360','[]','20.documents','default',1,'2025-03-21 00:00:00.000','1d'),
(1179,'b19a68791ffc2079ba7be04744728307','2025-03-21 09:58:19.363','2025-03-21 09:58:19.363','[]','20.documents','default',1,NULL,'inf'),
(1180,'13e7872e4ef3c7ce03aa976e128b2f8f','2025-03-21 09:58:19.370','2025-03-21 09:58:19.370','[]','20.1.documents','default',1,'2025-03-21 09:00:00.000','1h'),
(1181,'e3aa8d3f901a751364b625f88786ec0c','2025-03-21 09:58:19.373','2025-03-21 09:58:19.373','[]','20.1.documents','default',1,'2025-03-21 00:00:00.000','1d'),
(1182,'844cbed1c2c4f04de67ac39465dab979','2025-03-21 09:58:19.376','2025-03-21 09:58:19.376','[]','20.1.documents','default',1,NULL,'inf'),
(1210,'83addb5bb5192040543118e2b345b347','2025-03-21 09:59:04.824','2025-03-21 09:59:04.824','[]','21.databases.storage','default',114688,'2025-03-21 09:00:00.000','1h'),
(1214,'5343914de43638c29bb3066d11959d34','2025-03-21 09:59:04.850','2025-03-21 09:59:04.850','[]','21.databases.storage','default',114688,'2025-03-21 00:00:00.000','1d'),
(1218,'d8c6cb1241f6caf03dc990a2669faf6a','2025-03-21 09:59:04.875','2025-03-21 09:59:04.875','[]','21.databases.storage','default',114688,NULL,'inf'),
(1231,'2c6703c781cae384fb5dff1d68e8768d','2025-03-21 09:59:05.174','2025-03-21 09:59:05.174','[]','21.collections','default',1,'2025-03-21 09:00:00.000','1h'),
(1232,'2092862fb69260edee6625355c50b88d','2025-03-21 09:59:05.178','2025-03-21 09:59:05.178','[]','21.collections','default',1,'2025-03-21 00:00:00.000','1d'),
(1233,'3f6c80a1b50fe0b1af5223b078265cab','2025-03-21 09:59:05.186','2025-03-21 09:59:05.186','[]','21.collections','default',1,NULL,'inf'),
(1243,'d4e0e1f2dc1e62be62da0a90012c9d40','2025-03-21 09:59:05.246','2025-03-21 09:59:05.246','[]','21.documents','default',1,'2025-03-21 09:00:00.000','1h'),
(1244,'5ebb76e57b95d7d3447e00ad51c7702e','2025-03-21 09:59:05.249','2025-03-21 09:59:05.249','[]','21.documents','default',1,'2025-03-21 00:00:00.000','1d'),
(1245,'ed71a6c43f08b94b048670a1a578b2e1','2025-03-21 09:59:05.252','2025-03-21 09:59:05.252','[]','21.documents','default',1,NULL,'inf'),
(1246,'28c22bce9832daff030a239e3ac688d2','2025-03-21 09:59:05.256','2025-03-21 09:59:05.256','[]','21.1.documents','default',1,'2025-03-21 09:00:00.000','1h'),
(1247,'482b5e0578d908e645c8321bfd15f7c1','2025-03-21 09:59:05.259','2025-03-21 09:59:05.259','[]','21.1.documents','default',1,'2025-03-21 00:00:00.000','1d'),
(1248,'9be1e474edc8fc24902a5650d9fb0b03','2025-03-21 09:59:05.261','2025-03-21 09:59:05.261','[]','21.1.documents','default',1,NULL,'inf'),
(1276,'4010f2dc9c7b7f144e0579a8e1d3cd57','2025-03-21 09:59:50.763','2025-03-21 09:59:50.763','[]','22.databases.storage','default',114688,'2025-03-21 09:00:00.000','1h'),
(1280,'f930926093b8733b6bcc629314a1f3bb','2025-03-21 09:59:50.787','2025-03-21 09:59:50.787','[]','22.databases.storage','default',114688,'2025-03-21 00:00:00.000','1d'),
(1284,'361c353766c9b1ccb7946e08a0d277ac','2025-03-21 09:59:50.813','2025-03-21 09:59:50.813','[]','22.databases.storage','default',114688,NULL,'inf'),
(1297,'7575d310247f216dfe78699a04ffee7d','2025-03-21 09:59:51.086','2025-03-21 09:59:51.086','[]','22.collections','default',1,'2025-03-21 09:00:00.000','1h'),
(1298,'a22267e3b39ba2fb2b2dcea2fdacf9c8','2025-03-21 09:59:51.091','2025-03-21 09:59:51.091','[]','22.collections','default',1,'2025-03-21 00:00:00.000','1d'),
(1299,'232070dd0b9b7919f142468175ea1367','2025-03-21 09:59:51.102','2025-03-21 09:59:51.102','[]','22.collections','default',1,NULL,'inf'),
(1309,'34a634d77ecf0c2a223563aedfa0b20e','2025-03-21 09:59:51.157','2025-03-21 09:59:51.157','[]','22.documents','default',1,'2025-03-21 09:00:00.000','1h'),
(1310,'e3a0b39fe590aeea8ea4c7b4d2ddd07f','2025-03-21 09:59:51.164','2025-03-21 09:59:51.164','[]','22.documents','default',1,'2025-03-21 00:00:00.000','1d'),
(1311,'f410dbe0fcfed8c2c023df6cbe6fb076','2025-03-21 09:59:51.168','2025-03-21 09:59:51.168','[]','22.documents','default',1,NULL,'inf'),
(1312,'a48fe06e8c8bb4ee161465c13767bf68','2025-03-21 09:59:51.172','2025-03-21 09:59:51.172','[]','22.1.documents','default',1,'2025-03-21 09:00:00.000','1h'),
(1313,'74922194e1295535bbdda49187fbf858','2025-03-21 09:59:51.175','2025-03-21 09:59:51.175','[]','22.1.documents','default',1,'2025-03-21 00:00:00.000','1d'),
(1314,'bd5dafd4ea0d9325d2da6d214f8a0ec8','2025-03-21 09:59:51.178','2025-03-21 09:59:51.178','[]','22.1.documents','default',1,NULL,'inf'),
(1315,'314f0751892255dff7bb3ea81b1cb6c0','2025-03-21 10:09:00.023','2025-03-21 10:11:49.057','[]','network.requests','default',333,'2025-03-21 10:00:00.000','1h'),
(1322,'427ff4acf4d664c1ea391a842b6e3436','2025-03-21 10:09:00.069','2025-03-21 10:11:49.108','[]','network.inbound','default',138274,'2025-03-21 10:00:00.000','1h'),
(1329,'f5dc046e253be0bf61a3412c7e502cb6','2025-03-21 10:09:00.111','2025-03-21 10:11:49.162','[]','network.outbound','default',280901,'2025-03-21 10:00:00.000','1h'),
(1336,'6c094efbca015be941bde5fcc782e404','2025-03-21 10:09:00.154','2025-03-21 10:09:00.154','[]','23.databases.storage','default',114688,'2025-03-21 10:00:00.000','1h'),
(1337,'54159ca1f5761107b00c9d534f128691','2025-03-21 10:09:00.156','2025-03-21 10:11:49.229','[]','databases.storage','default',458752,'2025-03-21 10:00:00.000','1h'),
(1338,'e88da461a06741cb68b29b09014c5855','2025-03-21 10:09:00.161','2025-03-21 10:09:00.161','[]','23.databases.storage','default',114688,'2025-03-21 00:00:00.000','1d'),
(1342,'8e9c77cdb4f39d5d7e3e2f91f2429a58','2025-03-21 10:09:00.189','2025-03-21 10:09:00.189','[]','23.databases.storage','default',114688,NULL,'inf'),
(1346,'afc09331fb3b9e1dea58846793cd9be8','2025-03-21 10:09:00.211','2025-03-21 10:11:49.426','[]','collections','default',4,'2025-03-21 10:00:00.000','1h'),
(1353,'1432bcd3f400ea88f1612de06f2cffb9','2025-03-21 10:09:00.246','2025-03-21 10:09:00.246','[]','23.collections','default',1,'2025-03-21 10:00:00.000','1h'),
(1354,'989a34a8ce892f83b22114f34135f6cf','2025-03-21 10:09:00.250','2025-03-21 10:09:00.250','[]','23.collections','default',1,'2025-03-21 00:00:00.000','1d'),
(1355,'9bd29ad497afb62f755bfcbea098b5bd','2025-03-21 10:09:00.262','2025-03-21 10:09:00.262','[]','23.collections','default',1,NULL,'inf'),
(1356,'ec6b455d1ccc1a15398c4b01a508c70f','2025-03-21 10:09:00.265','2025-03-21 10:11:49.567','[]','documents','default',4,'2025-03-21 10:00:00.000','1h'),
(1363,'f0bd427c65518451b2f362eddbd1c2e6','2025-03-21 10:09:00.481','2025-03-21 10:09:00.481','[]','23.documents','default',1,'2025-03-21 10:00:00.000','1h'),
(1364,'1d4ad38bb354e30851d821833eb24c56','2025-03-21 10:09:00.485','2025-03-21 10:09:00.485','[]','23.documents','default',1,'2025-03-21 00:00:00.000','1d'),
(1365,'80f52ebff6e415d99cc549e4d3f8ebd8','2025-03-21 10:09:00.489','2025-03-21 10:09:00.489','[]','23.documents','default',1,NULL,'inf'),
(1366,'516b8a4c844d6a5d72d0da502334957e','2025-03-21 10:09:00.495','2025-03-21 10:09:00.495','[]','23.1.documents','default',1,'2025-03-21 10:00:00.000','1h'),
(1367,'bdb5c90d9fdd9a86aa92942ea5dd0f41','2025-03-21 10:09:00.498','2025-03-21 10:09:00.498','[]','23.1.documents','default',1,'2025-03-21 00:00:00.000','1d'),
(1368,'20b99205e75e4e6942a885f9955cea9a','2025-03-21 10:09:00.502','2025-03-21 10:09:00.502','[]','23.1.documents','default',1,NULL,'inf'),
(1396,'62ce1267ed0972ef7fc60807c54f7355','2025-03-21 10:10:18.067','2025-03-21 10:10:18.067','[]','24.databases.storage','default',114688,'2025-03-21 10:00:00.000','1h'),
(1400,'e72a1f8db7217e95310988b8ed23e48a','2025-03-21 10:10:18.093','2025-03-21 10:10:18.093','[]','24.databases.storage','default',114688,'2025-03-21 00:00:00.000','1d'),
(1413,'fa1abfcae6eb549caf57705b15e13100','2025-03-21 10:10:18.333','2025-03-21 10:10:18.333','[]','24.collections','default',1,'2025-03-21 10:00:00.000','1h'),
(1414,'19c3525f9258e7c5d7c193ced37722cc','2025-03-21 10:10:18.336','2025-03-21 10:10:18.336','[]','24.collections','default',1,'2025-03-21 00:00:00.000','1d'),
(1415,'a294484f44e40e14a7663b8e1add7f55','2025-03-21 10:10:18.340','2025-03-21 10:10:18.340','[]','24.collections','default',1,NULL,'inf'),
(1425,'1b67a6204bdb46e0935d37f508daba6d','2025-03-21 10:10:18.439','2025-03-21 10:10:18.439','[]','24.documents','default',1,'2025-03-21 10:00:00.000','1h'),
(1426,'262fe68a240fcdc45a7faf62a7b180f3','2025-03-21 10:10:18.443','2025-03-21 10:10:18.443','[]','24.documents','default',1,'2025-03-21 00:00:00.000','1d'),
(1427,'9d78711fb18c838925b8ad1eecfefb7a','2025-03-21 10:10:18.447','2025-03-21 10:10:18.447','[]','24.documents','default',1,NULL,'inf'),
(1428,'b07e1778308e48d7ecb1fbf6d9b90f48','2025-03-21 10:10:18.450','2025-03-21 10:10:18.450','[]','24.1.documents','default',1,'2025-03-21 10:00:00.000','1h'),
(1429,'08a561982eb47c8a42c20042af2abc20','2025-03-21 10:10:18.454','2025-03-21 10:10:18.454','[]','24.1.documents','default',1,'2025-03-21 00:00:00.000','1d'),
(1430,'4311c7db3220ff52cb04e748eed06a2d','2025-03-21 10:10:18.457','2025-03-21 10:10:18.457','[]','24.1.documents','default',1,NULL,'inf'),
(1458,'b601e05c6f6fe259c04437549edae427','2025-03-21 10:11:18.247','2025-03-21 10:11:18.247','[]','25.databases.storage','default',114688,'2025-03-21 10:00:00.000','1h'),
(1462,'17ae183ff7b2b4bef4cf8b6d996aa9fb','2025-03-21 10:11:18.268','2025-03-21 10:11:18.268','[]','25.databases.storage','default',114688,'2025-03-21 00:00:00.000','1d'),
(1466,'8b7f459fd2730ed8c216a2996af7056f','2025-03-21 10:11:18.288','2025-03-21 10:11:18.288','[]','25.databases.storage','default',114688,NULL,'inf'),
(1479,'2002e14a9de7a5982fda9ff31ed543e7','2025-03-21 10:11:18.533','2025-03-21 10:11:18.533','[]','25.collections','default',1,'2025-03-21 10:00:00.000','1h'),
(1480,'55e6cd5d516143e751885c41930d1420','2025-03-21 10:11:18.536','2025-03-21 10:11:18.536','[]','25.collections','default',1,'2025-03-21 00:00:00.000','1d'),
(1481,'47f363a70bc8b40b07f2191cd94561ed','2025-03-21 10:11:18.539','2025-03-21 10:11:18.539','[]','25.collections','default',1,NULL,'inf'),
(1491,'5cbd91df358506a27e0940e9652bcbc4','2025-03-21 10:11:18.635','2025-03-21 10:11:18.635','[]','25.documents','default',1,'2025-03-21 10:00:00.000','1h'),
(1492,'6c6ffc65c7b99f1e61ffdb8d17c81f25','2025-03-21 10:11:18.638','2025-03-21 10:11:18.638','[]','25.documents','default',1,'2025-03-21 00:00:00.000','1d'),
(1493,'7895cb23600fc6f3b73cebf38ce6f57d','2025-03-21 10:11:18.641','2025-03-21 10:11:18.641','[]','25.documents','default',1,NULL,'inf'),
(1494,'f59b43c94c19c67c1ca77b52dd7de2d1','2025-03-21 10:11:18.644','2025-03-21 10:11:18.644','[]','25.1.documents','default',1,'2025-03-21 10:00:00.000','1h'),
(1495,'5aee66530f73b60a120f86ce0333b485','2025-03-21 10:11:18.648','2025-03-21 10:11:18.648','[]','25.1.documents','default',1,'2025-03-21 00:00:00.000','1d'),
(1496,'58439847b0fb7b5d1775ef7ac1fd06b7','2025-03-21 10:11:18.650','2025-03-21 10:11:18.650','[]','25.1.documents','default',1,NULL,'inf'),
(1524,'28f77f04f89c645bdf6440f46c90dc7e','2025-03-21 10:11:49.209','2025-03-21 10:11:49.209','[]','26.databases.storage','default',114688,'2025-03-21 10:00:00.000','1h'),
(1528,'99700bcd41de78c96dd659bde5453727','2025-03-21 10:11:49.236','2025-03-21 10:11:49.236','[]','26.databases.storage','default',114688,'2025-03-21 00:00:00.000','1d'),
(1532,'0a8bf399e650494360dc754b75f5da62','2025-03-21 10:11:49.264','2025-03-21 10:11:49.264','[]','26.databases.storage','default',114688,NULL,'inf'),
(1545,'4609cfccbce124bb7a08f1283f9470bc','2025-03-21 10:11:49.534','2025-03-21 10:11:49.534','[]','26.collections','default',1,'2025-03-21 10:00:00.000','1h'),
(1546,'2c2857dde4c15f4c2fa9a8b45652374c','2025-03-21 10:11:49.543','2025-03-21 10:11:49.543','[]','26.collections','default',1,'2025-03-21 00:00:00.000','1d'),
(1547,'5e2f386c11ce13e1d8ff1cc096ddafae','2025-03-21 10:11:49.548','2025-03-21 10:11:49.548','[]','26.collections','default',1,NULL,'inf'),
(1557,'6d4c4c57e9c570ce973a430a664fdcc2','2025-03-21 10:11:49.615','2025-03-21 10:11:49.615','[]','26.documents','default',1,'2025-03-21 10:00:00.000','1h'),
(1558,'a68c831eab8409d6547422f5fa31e8fd','2025-03-21 10:11:49.618','2025-03-21 10:11:49.618','[]','26.documents','default',1,'2025-03-21 00:00:00.000','1d'),
(1559,'04b320ee63a1e71b6cf855da8eaa9bbe','2025-03-21 10:11:49.627','2025-03-21 10:11:49.627','[]','26.documents','default',1,NULL,'inf'),
(1560,'a2df226d310b2e87efc16385eaf23862','2025-03-21 10:11:49.631','2025-03-21 10:11:49.631','[]','26.1.documents','default',1,'2025-03-21 10:00:00.000','1h'),
(1561,'d94c46c3efc9dacbb966b77556c6d4bf','2025-03-21 10:11:49.635','2025-03-21 10:11:49.635','[]','26.1.documents','default',1,'2025-03-21 00:00:00.000','1d'),
(1562,'fd7e8a1aba981f2d9cc7db1a229b65fc','2025-03-21 10:11:49.644','2025-03-21 10:11:49.644','[]','26.1.documents','default',1,NULL,'inf');
/*!40000 ALTER TABLE `_2_stats` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_2_stats_perms`
--

DROP TABLE IF EXISTS `_2_stats_perms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_2_stats_perms` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_type` varchar(12) NOT NULL,
  `_permission` varchar(255) NOT NULL,
  `_document` varchar(255) NOT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_index1` (`_document`,`_type`,`_permission`),
  KEY `_permission` (`_permission`,`_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_2_stats_perms`
--

LOCK TABLES `_2_stats_perms` WRITE;
/*!40000 ALTER TABLE `_2_stats_perms` DISABLE KEYS */;
/*!40000 ALTER TABLE `_2_stats_perms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_2_subscribers`
--

DROP TABLE IF EXISTS `_2_subscribers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_2_subscribers` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_uid` varchar(255) NOT NULL,
  `_createdAt` datetime(3) DEFAULT NULL,
  `_updatedAt` datetime(3) DEFAULT NULL,
  `_permissions` mediumtext DEFAULT NULL,
  `targetId` varchar(255) DEFAULT NULL,
  `targetInternalId` varchar(255) DEFAULT NULL,
  `userId` varchar(255) DEFAULT NULL,
  `userInternalId` varchar(255) DEFAULT NULL,
  `topicId` varchar(255) DEFAULT NULL,
  `topicInternalId` varchar(255) DEFAULT NULL,
  `providerType` varchar(128) DEFAULT NULL,
  `search` text DEFAULT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_uid` (`_uid`),
  UNIQUE KEY `_unique_target_topic` (`targetInternalId`,`topicInternalId`),
  KEY `_key_targetId` (`targetId`),
  KEY `_key_targetInternalId` (`targetInternalId`),
  KEY `_key_userId` (`userId`),
  KEY `_key_userInternalId` (`userInternalId`),
  KEY `_key_topicId` (`topicId`),
  KEY `_key_topicInternalId` (`topicInternalId`),
  KEY `_created_at` (`_createdAt`),
  KEY `_updated_at` (`_updatedAt`),
  FULLTEXT KEY `_fulltext_search` (`search`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_2_subscribers`
--

LOCK TABLES `_2_subscribers` WRITE;
/*!40000 ALTER TABLE `_2_subscribers` DISABLE KEYS */;
/*!40000 ALTER TABLE `_2_subscribers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_2_subscribers_perms`
--

DROP TABLE IF EXISTS `_2_subscribers_perms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_2_subscribers_perms` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_type` varchar(12) NOT NULL,
  `_permission` varchar(255) NOT NULL,
  `_document` varchar(255) NOT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_index1` (`_document`,`_type`,`_permission`),
  KEY `_permission` (`_permission`,`_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_2_subscribers_perms`
--

LOCK TABLES `_2_subscribers_perms` WRITE;
/*!40000 ALTER TABLE `_2_subscribers_perms` DISABLE KEYS */;
/*!40000 ALTER TABLE `_2_subscribers_perms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_2_targets`
--

DROP TABLE IF EXISTS `_2_targets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_2_targets` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_uid` varchar(255) NOT NULL,
  `_createdAt` datetime(3) DEFAULT NULL,
  `_updatedAt` datetime(3) DEFAULT NULL,
  `_permissions` mediumtext DEFAULT NULL,
  `userId` varchar(255) DEFAULT NULL,
  `userInternalId` varchar(255) DEFAULT NULL,
  `sessionId` varchar(255) DEFAULT NULL,
  `sessionInternalId` varchar(255) DEFAULT NULL,
  `providerType` varchar(255) DEFAULT NULL,
  `providerId` varchar(255) DEFAULT NULL,
  `providerInternalId` varchar(255) DEFAULT NULL,
  `identifier` varchar(255) DEFAULT NULL,
  `name` varchar(255) DEFAULT NULL,
  `expired` tinyint(1) DEFAULT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_uid` (`_uid`),
  UNIQUE KEY `_key_identifier` (`identifier`),
  KEY `_key_userId` (`userId`),
  KEY `_key_userInternalId` (`userInternalId`),
  KEY `_key_providerId` (`providerId`),
  KEY `_key_providerInternalId` (`providerInternalId`),
  KEY `_created_at` (`_createdAt`),
  KEY `_updated_at` (`_updatedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_2_targets`
--

LOCK TABLES `_2_targets` WRITE;
/*!40000 ALTER TABLE `_2_targets` DISABLE KEYS */;
/*!40000 ALTER TABLE `_2_targets` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_2_targets_perms`
--

DROP TABLE IF EXISTS `_2_targets_perms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_2_targets_perms` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_type` varchar(12) NOT NULL,
  `_permission` varchar(255) NOT NULL,
  `_document` varchar(255) NOT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_index1` (`_document`,`_type`,`_permission`),
  KEY `_permission` (`_permission`,`_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_2_targets_perms`
--

LOCK TABLES `_2_targets_perms` WRITE;
/*!40000 ALTER TABLE `_2_targets_perms` DISABLE KEYS */;
/*!40000 ALTER TABLE `_2_targets_perms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_2_teams`
--

DROP TABLE IF EXISTS `_2_teams`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_2_teams` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_uid` varchar(255) NOT NULL,
  `_createdAt` datetime(3) DEFAULT NULL,
  `_updatedAt` datetime(3) DEFAULT NULL,
  `_permissions` mediumtext DEFAULT NULL,
  `name` varchar(128) DEFAULT NULL,
  `total` int(11) DEFAULT NULL,
  `search` text DEFAULT NULL,
  `prefs` text DEFAULT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_uid` (`_uid`),
  KEY `_key_name` (`name`),
  KEY `_key_total` (`total`),
  KEY `_created_at` (`_createdAt`),
  KEY `_updated_at` (`_updatedAt`),
  FULLTEXT KEY `_key_search` (`search`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_2_teams`
--

LOCK TABLES `_2_teams` WRITE;
/*!40000 ALTER TABLE `_2_teams` DISABLE KEYS */;
/*!40000 ALTER TABLE `_2_teams` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_2_teams_perms`
--

DROP TABLE IF EXISTS `_2_teams_perms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_2_teams_perms` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_type` varchar(12) NOT NULL,
  `_permission` varchar(255) NOT NULL,
  `_document` varchar(255) NOT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_index1` (`_document`,`_type`,`_permission`),
  KEY `_permission` (`_permission`,`_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_2_teams_perms`
--

LOCK TABLES `_2_teams_perms` WRITE;
/*!40000 ALTER TABLE `_2_teams_perms` DISABLE KEYS */;
/*!40000 ALTER TABLE `_2_teams_perms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_2_tokens`
--

DROP TABLE IF EXISTS `_2_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_2_tokens` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_uid` varchar(255) NOT NULL,
  `_createdAt` datetime(3) DEFAULT NULL,
  `_updatedAt` datetime(3) DEFAULT NULL,
  `_permissions` mediumtext DEFAULT NULL,
  `userInternalId` varchar(255) DEFAULT NULL,
  `userId` varchar(255) DEFAULT NULL,
  `type` int(11) DEFAULT NULL,
  `secret` varchar(512) DEFAULT NULL,
  `expire` datetime(3) DEFAULT NULL,
  `userAgent` text DEFAULT NULL,
  `ip` varchar(45) DEFAULT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_uid` (`_uid`),
  KEY `_key_user` (`userInternalId`),
  KEY `_created_at` (`_createdAt`),
  KEY `_updated_at` (`_updatedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_2_tokens`
--

LOCK TABLES `_2_tokens` WRITE;
/*!40000 ALTER TABLE `_2_tokens` DISABLE KEYS */;
/*!40000 ALTER TABLE `_2_tokens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_2_tokens_perms`
--

DROP TABLE IF EXISTS `_2_tokens_perms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_2_tokens_perms` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_type` varchar(12) NOT NULL,
  `_permission` varchar(255) NOT NULL,
  `_document` varchar(255) NOT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_index1` (`_document`,`_type`,`_permission`),
  KEY `_permission` (`_permission`,`_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_2_tokens_perms`
--

LOCK TABLES `_2_tokens_perms` WRITE;
/*!40000 ALTER TABLE `_2_tokens_perms` DISABLE KEYS */;
/*!40000 ALTER TABLE `_2_tokens_perms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_2_topics`
--

DROP TABLE IF EXISTS `_2_topics`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_2_topics` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_uid` varchar(255) NOT NULL,
  `_createdAt` datetime(3) DEFAULT NULL,
  `_updatedAt` datetime(3) DEFAULT NULL,
  `_permissions` mediumtext DEFAULT NULL,
  `name` varchar(128) DEFAULT NULL,
  `subscribe` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`subscribe`)),
  `emailTotal` int(11) DEFAULT NULL,
  `smsTotal` int(11) DEFAULT NULL,
  `pushTotal` int(11) DEFAULT NULL,
  `targets` text DEFAULT NULL,
  `search` text DEFAULT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_uid` (`_uid`),
  KEY `_created_at` (`_createdAt`),
  KEY `_updated_at` (`_updatedAt`),
  FULLTEXT KEY `_key_name` (`name`),
  FULLTEXT KEY `_key_search` (`search`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_2_topics`
--

LOCK TABLES `_2_topics` WRITE;
/*!40000 ALTER TABLE `_2_topics` DISABLE KEYS */;
/*!40000 ALTER TABLE `_2_topics` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_2_topics_perms`
--

DROP TABLE IF EXISTS `_2_topics_perms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_2_topics_perms` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_type` varchar(12) NOT NULL,
  `_permission` varchar(255) NOT NULL,
  `_document` varchar(255) NOT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_index1` (`_document`,`_type`,`_permission`),
  KEY `_permission` (`_permission`,`_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_2_topics_perms`
--

LOCK TABLES `_2_topics_perms` WRITE;
/*!40000 ALTER TABLE `_2_topics_perms` DISABLE KEYS */;
/*!40000 ALTER TABLE `_2_topics_perms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_2_users`
--

DROP TABLE IF EXISTS `_2_users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_2_users` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_uid` varchar(255) NOT NULL,
  `_createdAt` datetime(3) DEFAULT NULL,
  `_updatedAt` datetime(3) DEFAULT NULL,
  `_permissions` mediumtext DEFAULT NULL,
  `name` varchar(256) DEFAULT NULL,
  `email` varchar(320) DEFAULT NULL,
  `phone` varchar(16) DEFAULT NULL,
  `status` tinyint(1) DEFAULT NULL,
  `labels` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`labels`)),
  `passwordHistory` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`passwordHistory`)),
  `password` text DEFAULT NULL,
  `hash` varchar(256) DEFAULT NULL,
  `hashOptions` text DEFAULT NULL,
  `passwordUpdate` datetime(3) DEFAULT NULL,
  `prefs` text DEFAULT NULL,
  `registration` datetime(3) DEFAULT NULL,
  `emailVerification` tinyint(1) DEFAULT NULL,
  `phoneVerification` tinyint(1) DEFAULT NULL,
  `reset` tinyint(1) DEFAULT NULL,
  `mfa` tinyint(1) DEFAULT NULL,
  `mfaRecoveryCodes` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`mfaRecoveryCodes`)),
  `authenticators` text DEFAULT NULL,
  `sessions` text DEFAULT NULL,
  `tokens` text DEFAULT NULL,
  `challenges` text DEFAULT NULL,
  `memberships` text DEFAULT NULL,
  `targets` text DEFAULT NULL,
  `search` text DEFAULT NULL,
  `accessedAt` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_uid` (`_uid`),
  UNIQUE KEY `_key_phone` (`phone`),
  UNIQUE KEY `_key_email` (`email`(256)),
  KEY `_key_name` (`name`),
  KEY `_key_status` (`status`),
  KEY `_key_passwordUpdate` (`passwordUpdate`),
  KEY `_key_registration` (`registration`),
  KEY `_key_emailVerification` (`emailVerification`),
  KEY `_key_phoneVerification` (`phoneVerification`),
  KEY `_key_accessedAt` (`accessedAt`),
  KEY `_created_at` (`_createdAt`),
  KEY `_updated_at` (`_updatedAt`),
  FULLTEXT KEY `_key_search` (`search`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_2_users`
--

LOCK TABLES `_2_users` WRITE;
/*!40000 ALTER TABLE `_2_users` DISABLE KEYS */;
/*!40000 ALTER TABLE `_2_users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_2_users_perms`
--

DROP TABLE IF EXISTS `_2_users_perms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_2_users_perms` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_type` varchar(12) NOT NULL,
  `_permission` varchar(255) NOT NULL,
  `_document` varchar(255) NOT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_index1` (`_document`,`_type`,`_permission`),
  KEY `_permission` (`_permission`,`_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_2_users_perms`
--

LOCK TABLES `_2_users_perms` WRITE;
/*!40000 ALTER TABLE `_2_users_perms` DISABLE KEYS */;
/*!40000 ALTER TABLE `_2_users_perms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_2_variables`
--

DROP TABLE IF EXISTS `_2_variables`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_2_variables` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_uid` varchar(255) NOT NULL,
  `_createdAt` datetime(3) DEFAULT NULL,
  `_updatedAt` datetime(3) DEFAULT NULL,
  `_permissions` mediumtext DEFAULT NULL,
  `resourceType` varchar(100) DEFAULT NULL,
  `resourceInternalId` varchar(255) DEFAULT NULL,
  `resourceId` varchar(255) DEFAULT NULL,
  `key` varchar(255) DEFAULT NULL,
  `value` varchar(8192) DEFAULT NULL,
  `search` text DEFAULT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_uid` (`_uid`),
  UNIQUE KEY `_key_uniqueKey` (`resourceId`,`key`,`resourceType`),
  KEY `_key_resourceInternalId` (`resourceInternalId`),
  KEY `_key_resourceType` (`resourceType`),
  KEY `_key_resourceId_resourceType` (`resourceId`,`resourceType`),
  KEY `_key_key` (`key`),
  KEY `_created_at` (`_createdAt`),
  KEY `_updated_at` (`_updatedAt`),
  FULLTEXT KEY `_fulltext_search` (`search`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_2_variables`
--

LOCK TABLES `_2_variables` WRITE;
/*!40000 ALTER TABLE `_2_variables` DISABLE KEYS */;
/*!40000 ALTER TABLE `_2_variables` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_2_variables_perms`
--

DROP TABLE IF EXISTS `_2_variables_perms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_2_variables_perms` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_type` varchar(12) NOT NULL,
  `_permission` varchar(255) NOT NULL,
  `_document` varchar(255) NOT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_index1` (`_document`,`_type`,`_permission`),
  KEY `_permission` (`_permission`,`_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_2_variables_perms`
--

LOCK TABLES `_2_variables_perms` WRITE;
/*!40000 ALTER TABLE `_2_variables_perms` DISABLE KEYS */;
/*!40000 ALTER TABLE `_2_variables_perms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_console__metadata`
--

DROP TABLE IF EXISTS `_console__metadata`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_console__metadata` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_uid` varchar(255) NOT NULL,
  `_createdAt` datetime(3) DEFAULT NULL,
  `_updatedAt` datetime(3) DEFAULT NULL,
  `_permissions` mediumtext DEFAULT NULL,
  `name` varchar(256) DEFAULT NULL,
  `attributes` mediumtext DEFAULT NULL,
  `indexes` mediumtext DEFAULT NULL,
  `documentSecurity` tinyint(1) DEFAULT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_uid` (`_uid`),
  KEY `_created_at` (`_createdAt`),
  KEY `_updated_at` (`_updatedAt`)
) ENGINE=InnoDB AUTO_INCREMENT=32 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_console__metadata`
--

LOCK TABLES `_console__metadata` WRITE;
/*!40000 ALTER TABLE `_console__metadata` DISABLE KEYS */;
INSERT INTO `_console__metadata` VALUES
(1,'audit','2025-03-13 11:11:41.693','2025-03-13 11:11:41.693','[\"create(\\\"any\\\")\"]','audit','[{\"$id\":\"userId\",\"type\":\"string\",\"size\":255,\"required\":true,\"signed\":true,\"array\":false,\"filters\":[]},{\"$id\":\"event\",\"type\":\"string\",\"size\":255,\"required\":true,\"signed\":true,\"array\":false,\"filters\":[]},{\"$id\":\"resource\",\"type\":\"string\",\"size\":255,\"required\":false,\"signed\":true,\"array\":false,\"filters\":[]},{\"$id\":\"userAgent\",\"type\":\"string\",\"size\":65534,\"required\":true,\"signed\":true,\"array\":false,\"filters\":[]},{\"$id\":\"ip\",\"type\":\"string\",\"size\":45,\"required\":true,\"signed\":true,\"array\":false,\"filters\":[]},{\"$id\":\"location\",\"type\":\"string\",\"size\":45,\"required\":false,\"signed\":true,\"array\":false,\"filters\":[]},{\"$id\":\"time\",\"type\":\"datetime\",\"format\":\"\",\"size\":0,\"signed\":true,\"required\":false,\"array\":false,\"filters\":[\"datetime\"]},{\"$id\":\"data\",\"type\":\"string\",\"size\":16777216,\"required\":false,\"signed\":true,\"array\":false,\"filters\":[\"json\"]}]','[{\"$id\":\"index2\",\"type\":\"key\",\"attributes\":[\"event\"],\"lengths\":[],\"orders\":[]},{\"$id\":\"index4\",\"type\":\"key\",\"attributes\":[\"userId\",\"event\"],\"lengths\":[],\"orders\":[]},{\"$id\":\"index5\",\"type\":\"key\",\"attributes\":[\"resource\",\"event\"],\"lengths\":[],\"orders\":[]},{\"$id\":\"index-time\",\"type\":\"key\",\"attributes\":[\"time\"],\"lengths\":[],\"orders\":[\"DESC\"]}]',1),
(2,'abuse','2025-03-13 11:11:41.801','2025-03-13 11:11:41.801','[\"create(\\\"any\\\")\"]','abuse','[{\"$id\":\"key\",\"type\":\"string\",\"size\":255,\"required\":true,\"signed\":true,\"array\":false,\"filters\":[]},{\"$id\":\"time\",\"type\":\"datetime\",\"size\":0,\"required\":true,\"signed\":false,\"array\":false,\"filters\":[\"datetime\"]},{\"$id\":\"count\",\"type\":\"integer\",\"size\":11,\"required\":true,\"signed\":false,\"array\":false,\"filters\":[]}]','[{\"$id\":\"unique1\",\"type\":\"unique\",\"attributes\":[\"key\",\"time\"],\"lengths\":[],\"orders\":[]},{\"$id\":\"index2\",\"type\":\"key\",\"attributes\":[\"time\"],\"lengths\":[],\"orders\":[]}]',1),
(3,'projects','2025-03-13 11:11:41.993','2025-03-13 11:11:41.993','[\"create(\\\"any\\\")\"]','projects','[{\"$id\":\"teamInternalId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"teamId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"name\",\"type\":\"string\",\"format\":\"\",\"size\":128,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"region\",\"type\":\"string\",\"format\":\"\",\"size\":128,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"description\",\"type\":\"string\",\"format\":\"\",\"size\":256,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"database\",\"type\":\"string\",\"format\":\"\",\"size\":256,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"logo\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"url\",\"type\":\"string\",\"format\":\"\",\"size\":16384,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"version\",\"type\":\"string\",\"format\":\"\",\"size\":16,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"legalName\",\"type\":\"string\",\"format\":\"\",\"size\":256,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"legalCountry\",\"type\":\"string\",\"format\":\"\",\"size\":256,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"legalState\",\"type\":\"string\",\"format\":\"\",\"size\":256,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"legalCity\",\"type\":\"string\",\"format\":\"\",\"size\":256,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"legalAddress\",\"type\":\"string\",\"format\":\"\",\"size\":256,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"legalTaxId\",\"type\":\"string\",\"format\":\"\",\"size\":256,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"accessedAt\",\"type\":\"datetime\",\"format\":\"\",\"size\":0,\"signed\":false,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"datetime\"]},{\"$id\":\"services\",\"type\":\"string\",\"format\":\"\",\"size\":16384,\"signed\":true,\"required\":false,\"default\":[],\"array\":false,\"filters\":[\"json\"]},{\"$id\":\"apis\",\"type\":\"string\",\"format\":\"\",\"size\":16384,\"signed\":true,\"required\":false,\"default\":[],\"array\":false,\"filters\":[\"json\"]},{\"$id\":\"smtp\",\"type\":\"string\",\"format\":\"\",\"size\":16384,\"signed\":true,\"required\":false,\"default\":[],\"array\":false,\"filters\":[\"json\",\"encrypt\"]},{\"$id\":\"templates\",\"type\":\"string\",\"format\":\"\",\"size\":1000000,\"signed\":true,\"required\":false,\"default\":[],\"array\":false,\"filters\":[\"json\"]},{\"$id\":\"auths\",\"type\":\"string\",\"format\":\"\",\"size\":16384,\"signed\":true,\"required\":false,\"default\":[],\"array\":false,\"filters\":[\"json\"]},{\"$id\":\"oAuthProviders\",\"type\":\"string\",\"format\":\"\",\"size\":16384,\"signed\":true,\"required\":false,\"default\":[],\"array\":false,\"filters\":[\"json\",\"encrypt\"]},{\"$id\":\"platforms\",\"type\":\"string\",\"format\":\"\",\"size\":16384,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"subQueryPlatforms\"]},{\"$id\":\"webhooks\",\"type\":\"string\",\"format\":\"\",\"size\":16384,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"subQueryWebhooks\"]},{\"$id\":\"keys\",\"type\":\"string\",\"format\":\"\",\"size\":16384,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"subQueryKeys\"]},{\"$id\":\"search\",\"type\":\"string\",\"format\":\"\",\"size\":16384,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"pingCount\",\"type\":\"integer\",\"format\":\"\",\"size\":0,\"signed\":false,\"required\":false,\"default\":0,\"array\":false,\"filters\":[]},{\"$id\":\"pingedAt\",\"type\":\"datetime\",\"format\":\"\",\"size\":0,\"signed\":false,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"datetime\"]}]','[{\"$id\":\"_key_search\",\"type\":\"fulltext\",\"attributes\":[\"search\"],\"lengths\":[],\"orders\":[]},{\"$id\":\"_key_name\",\"type\":\"key\",\"attributes\":[\"name\"],\"lengths\":[128],\"orders\":[\"ASC\"]},{\"$id\":\"_key_team\",\"type\":\"key\",\"attributes\":[\"teamId\"],\"lengths\":[255],\"orders\":[\"ASC\"]},{\"$id\":\"_key_pingCount\",\"type\":\"key\",\"attributes\":[\"pingCount\"],\"lengths\":[],\"orders\":[]},{\"$id\":\"_key_pingedAt\",\"type\":\"key\",\"attributes\":[\"pingedAt\"],\"lengths\":[],\"orders\":[]}]',1),
(4,'schedules','2025-03-13 11:11:42.098','2025-03-13 11:11:42.098','[\"create(\\\"any\\\")\"]','schedules','[{\"$id\":\"resourceType\",\"type\":\"string\",\"format\":\"\",\"size\":100,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"resourceInternalId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"resourceId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"resourceUpdatedAt\",\"type\":\"datetime\",\"format\":\"\",\"size\":0,\"signed\":false,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"datetime\"]},{\"$id\":\"projectId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"schedule\",\"type\":\"string\",\"format\":\"\",\"size\":100,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"data\",\"type\":\"string\",\"format\":\"\",\"size\":65535,\"signed\":true,\"required\":false,\"default\":{},\"array\":false,\"filters\":[\"json\",\"encrypt\"]},{\"$id\":\"active\",\"type\":\"boolean\",\"signed\":true,\"size\":0,\"format\":\"\",\"filters\":[],\"required\":false,\"default\":null,\"array\":false},{\"$id\":\"region\",\"type\":\"string\",\"format\":\"\",\"size\":10,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]}]','[{\"$id\":\"_key_region_resourceType_resourceUpdatedAt\",\"type\":\"key\",\"attributes\":[\"region\",\"resourceType\",\"resourceUpdatedAt\"],\"lengths\":[],\"orders\":[]},{\"$id\":\"_key_region_resourceType_projectId_resourceId\",\"type\":\"key\",\"attributes\":[\"region\",\"resourceType\",\"projectId\",\"resourceId\"],\"lengths\":[],\"orders\":[]}]',1),
(5,'platforms','2025-03-13 11:11:42.200','2025-03-13 11:11:42.200','[\"create(\\\"any\\\")\"]','platforms','[{\"$id\":\"projectInternalId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"projectId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"type\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"name\",\"type\":\"string\",\"format\":\"\",\"size\":256,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"key\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"store\",\"type\":\"string\",\"format\":\"\",\"size\":256,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"hostname\",\"type\":\"string\",\"format\":\"\",\"size\":256,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]}]','[{\"$id\":\"_key_project\",\"type\":\"key\",\"attributes\":[\"projectInternalId\"],\"lengths\":[255],\"orders\":[\"ASC\"]}]',1),
(6,'keys','2025-03-13 11:11:42.303','2025-03-13 11:11:42.303','[\"create(\\\"any\\\")\"]','keys','[{\"$id\":\"projectInternalId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"projectId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":0,\"array\":false,\"filters\":[]},{\"$id\":\"name\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"scopes\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":true,\"default\":null,\"array\":true,\"filters\":[]},{\"$id\":\"secret\",\"type\":\"string\",\"format\":\"\",\"size\":512,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[\"encrypt\"]},{\"$id\":\"expire\",\"type\":\"datetime\",\"format\":\"\",\"size\":0,\"signed\":false,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"datetime\"]},{\"$id\":\"accessedAt\",\"type\":\"datetime\",\"format\":\"\",\"size\":0,\"signed\":false,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"datetime\"]},{\"$id\":\"sdks\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":true,\"default\":null,\"array\":true,\"filters\":[]}]','[{\"$id\":\"_key_project\",\"type\":\"key\",\"attributes\":[\"projectInternalId\"],\"lengths\":[255],\"orders\":[\"ASC\"]},{\"$id\":\"_key_accessedAt\",\"type\":\"key\",\"attributes\":[\"accessedAt\"],\"lengths\":[],\"orders\":[]}]',1),
(7,'webhooks','2025-03-13 11:11:42.405','2025-03-13 11:11:42.405','[\"create(\\\"any\\\")\"]','webhooks','[{\"$id\":\"projectInternalId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"projectId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"name\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"url\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"httpUser\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"httpPass\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"encrypt\"]},{\"$id\":\"security\",\"type\":\"boolean\",\"format\":\"\",\"size\":0,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"events\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":true,\"default\":null,\"array\":true,\"filters\":[]},{\"$id\":\"signatureKey\",\"type\":\"string\",\"format\":\"\",\"size\":2048,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"enabled\",\"type\":\"boolean\",\"signed\":true,\"size\":0,\"format\":\"\",\"filters\":[],\"required\":false,\"default\":true,\"array\":false},{\"$id\":\"logs\",\"type\":\"string\",\"format\":\"\",\"size\":1000000,\"signed\":true,\"required\":false,\"default\":\"\",\"array\":false,\"filters\":[]},{\"$id\":\"attempts\",\"type\":\"integer\",\"format\":\"\",\"size\":0,\"signed\":true,\"required\":false,\"default\":0,\"array\":false,\"filters\":[]}]','[{\"$id\":\"_key_project\",\"type\":\"key\",\"attributes\":[\"projectInternalId\"],\"lengths\":[255],\"orders\":[\"ASC\"]}]',1),
(8,'certificates','2025-03-13 11:11:42.516','2025-03-13 11:11:42.516','[\"create(\\\"any\\\")\"]','certificates','[{\"$id\":\"domain\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"issueDate\",\"type\":\"datetime\",\"format\":\"\",\"size\":0,\"signed\":false,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"datetime\"]},{\"$id\":\"renewDate\",\"type\":\"datetime\",\"format\":\"\",\"size\":0,\"signed\":false,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"datetime\"]},{\"$id\":\"attempts\",\"type\":\"integer\",\"format\":\"\",\"size\":0,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"logs\",\"type\":\"string\",\"format\":\"\",\"size\":1000000,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"updated\",\"type\":\"datetime\",\"format\":\"\",\"size\":0,\"signed\":false,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"datetime\"]}]','[{\"$id\":\"_key_domain\",\"type\":\"key\",\"attributes\":[\"domain\"],\"lengths\":[255],\"orders\":[\"ASC\"]}]',1),
(9,'realtime','2025-03-13 11:11:42.627','2025-03-13 11:11:42.627','[\"create(\\\"any\\\")\"]','realtime','[{\"$id\":\"container\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"timestamp\",\"type\":\"datetime\",\"format\":\"\",\"size\":0,\"signed\":false,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"datetime\"]},{\"$id\":\"value\",\"type\":\"string\",\"format\":\"\",\"size\":16384,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]}]','[{\"$id\":\"_key_timestamp\",\"type\":\"key\",\"attributes\":[\"timestamp\"],\"lengths\":[],\"orders\":[\"DESC\"]}]',1),
(10,'rules','2025-03-13 11:11:42.751','2025-03-13 11:11:42.751','[\"create(\\\"any\\\")\"]','rules','[{\"$id\":\"projectId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"projectInternalId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"domain\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"resourceType\",\"type\":\"string\",\"format\":\"\",\"size\":100,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"resourceInternalId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"resourceId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"status\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"certificateId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]}]','[{\"$id\":\"_key_domain\",\"type\":\"unique\",\"attributes\":[\"domain\"],\"lengths\":[255],\"orders\":[\"ASC\"]},{\"$id\":\"_key_projectInternalId\",\"type\":\"key\",\"attributes\":[\"projectInternalId\"],\"lengths\":[255],\"orders\":[\"ASC\"]},{\"$id\":\"_key_projectId\",\"type\":\"key\",\"attributes\":[\"projectId\"],\"lengths\":[255],\"orders\":[\"ASC\"]},{\"$id\":\"_key_resourceInternalId\",\"type\":\"key\",\"attributes\":[\"resourceInternalId\"],\"lengths\":[255],\"orders\":[\"ASC\"]},{\"$id\":\"_key_resourceId\",\"type\":\"key\",\"attributes\":[\"resourceId\"],\"lengths\":[255],\"orders\":[\"ASC\"]},{\"$id\":\"_key_resourceType\",\"type\":\"key\",\"attributes\":[\"resourceType\"],\"lengths\":[],\"orders\":[\"ASC\"]}]',1),
(11,'installations','2025-03-13 11:11:42.894','2025-03-13 11:11:42.894','[\"create(\\\"any\\\")\"]','installations','[{\"$id\":\"projectId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"projectInternalId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"providerInstallationId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"organization\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"provider\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"personal\",\"type\":\"boolean\",\"signed\":true,\"size\":0,\"format\":\"\",\"filters\":[],\"required\":false,\"default\":false,\"array\":false}]','[{\"$id\":\"_key_projectInternalId\",\"type\":\"key\",\"attributes\":[\"projectInternalId\"],\"lengths\":[255],\"orders\":[\"ASC\"]},{\"$id\":\"_key_projectId\",\"type\":\"key\",\"attributes\":[\"projectId\"],\"lengths\":[255],\"orders\":[\"ASC\"]},{\"$id\":\"_key_providerInstallationId\",\"type\":\"key\",\"attributes\":[\"providerInstallationId\"],\"lengths\":[255],\"orders\":[\"ASC\"]}]',1),
(12,'repositories','2025-03-13 11:11:43.047','2025-03-13 11:11:43.047','[\"create(\\\"any\\\")\"]','repositories','[{\"$id\":\"installationId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"installationInternalId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"projectId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"projectInternalId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"providerRepositoryId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"resourceId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"resourceInternalId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"resourceType\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"providerPullRequestIds\",\"type\":\"string\",\"format\":\"\",\"size\":128,\"signed\":true,\"required\":false,\"default\":null,\"array\":true,\"filters\":[]}]','[{\"$id\":\"_key_installationId\",\"type\":\"key\",\"attributes\":[\"installationId\"],\"lengths\":[255],\"orders\":[\"ASC\"]},{\"$id\":\"_key_installationInternalId\",\"type\":\"key\",\"attributes\":[\"installationInternalId\"],\"lengths\":[255],\"orders\":[\"ASC\"]},{\"$id\":\"_key_projectInternalId\",\"type\":\"key\",\"attributes\":[\"projectInternalId\"],\"lengths\":[255],\"orders\":[\"ASC\"]},{\"$id\":\"_key_projectId\",\"type\":\"key\",\"attributes\":[\"projectId\"],\"lengths\":[255],\"orders\":[\"ASC\"]},{\"$id\":\"_key_providerRepositoryId\",\"type\":\"key\",\"attributes\":[\"providerRepositoryId\"],\"lengths\":[255],\"orders\":[\"ASC\"]},{\"$id\":\"_key_resourceId\",\"type\":\"key\",\"attributes\":[\"resourceId\"],\"lengths\":[255],\"orders\":[\"ASC\"]},{\"$id\":\"_key_resourceInternalId\",\"type\":\"key\",\"attributes\":[\"resourceInternalId\"],\"lengths\":[255],\"orders\":[\"ASC\"]},{\"$id\":\"_key_resourceType\",\"type\":\"key\",\"attributes\":[\"resourceType\"],\"lengths\":[255],\"orders\":[\"ASC\"]}]',1),
(13,'vcsComments','2025-03-13 11:11:43.252','2025-03-13 11:11:43.252','[\"create(\\\"any\\\")\"]','vcsComments','[{\"$id\":\"installationId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"installationInternalId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"projectId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"projectInternalId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"providerRepositoryId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"providerCommentId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"providerPullRequestId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"providerBranch\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]}]','[{\"$id\":\"_key_installationId\",\"type\":\"key\",\"attributes\":[\"installationId\"],\"lengths\":[255],\"orders\":[\"ASC\"]},{\"$id\":\"_key_installationInternalId\",\"type\":\"key\",\"attributes\":[\"installationInternalId\"],\"lengths\":[255],\"orders\":[\"ASC\"]},{\"$id\":\"_key_projectInternalId\",\"type\":\"key\",\"attributes\":[\"projectInternalId\"],\"lengths\":[255],\"orders\":[\"ASC\"]},{\"$id\":\"_key_projectId\",\"type\":\"key\",\"attributes\":[\"projectId\"],\"lengths\":[255],\"orders\":[\"ASC\"]},{\"$id\":\"_key_providerRepositoryId\",\"type\":\"key\",\"attributes\":[\"providerRepositoryId\"],\"lengths\":[255],\"orders\":[\"ASC\"]},{\"$id\":\"_key_providerPullRequestId\",\"type\":\"key\",\"attributes\":[\"providerPullRequestId\"],\"lengths\":[255],\"orders\":[\"ASC\"]},{\"$id\":\"_key_providerBranch\",\"type\":\"key\",\"attributes\":[\"providerBranch\"],\"lengths\":[255],\"orders\":[\"ASC\"]}]',1),
(14,'vcsCommentLocks','2025-03-13 11:11:43.372','2025-03-13 11:11:43.372','[\"create(\\\"any\\\")\"]','vcsCommentLocks','[]','[]',1),
(15,'cache','2025-03-13 11:11:43.566','2025-03-13 11:11:43.566','[\"create(\\\"any\\\")\"]','cache','[{\"$id\":\"resource\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"resourceType\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"mimeType\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"accessedAt\",\"type\":\"datetime\",\"format\":\"\",\"size\":0,\"signed\":false,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"datetime\"]},{\"$id\":\"signature\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]}]','[{\"$id\":\"_key_accessedAt\",\"type\":\"key\",\"attributes\":[\"accessedAt\"],\"lengths\":[],\"orders\":[]},{\"$id\":\"_key_resource\",\"type\":\"key\",\"attributes\":[\"resource\"],\"lengths\":[],\"orders\":[]}]',1),
(16,'users','2025-03-13 11:11:43.897','2025-03-13 11:11:43.897','[\"create(\\\"any\\\")\"]','users','[{\"$id\":\"name\",\"type\":\"string\",\"format\":\"\",\"size\":256,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"email\",\"type\":\"string\",\"format\":\"\",\"size\":320,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"phone\",\"type\":\"string\",\"format\":\"\",\"size\":16,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"status\",\"type\":\"boolean\",\"format\":\"\",\"size\":0,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"labels\",\"type\":\"string\",\"format\":\"\",\"size\":128,\"signed\":true,\"required\":false,\"default\":null,\"array\":true,\"filters\":[]},{\"$id\":\"passwordHistory\",\"type\":\"string\",\"format\":\"\",\"size\":16384,\"signed\":true,\"required\":false,\"default\":null,\"array\":true,\"filters\":[]},{\"$id\":\"password\",\"type\":\"string\",\"format\":\"\",\"size\":16384,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"encrypt\"]},{\"$id\":\"hash\",\"type\":\"string\",\"format\":\"\",\"size\":256,\"signed\":true,\"required\":false,\"default\":\"argon2\",\"array\":false,\"filters\":[]},{\"$id\":\"hashOptions\",\"type\":\"string\",\"format\":\"\",\"size\":65535,\"signed\":true,\"required\":false,\"default\":{\"type\":\"argon2\",\"memoryCost\":2048,\"timeCost\":4,\"threads\":3},\"array\":false,\"filters\":[\"json\"]},{\"$id\":\"passwordUpdate\",\"type\":\"datetime\",\"format\":\"\",\"size\":0,\"signed\":false,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"datetime\"]},{\"$id\":\"prefs\",\"type\":\"string\",\"format\":\"\",\"size\":65535,\"signed\":true,\"required\":false,\"default\":{},\"array\":false,\"filters\":[\"json\"]},{\"$id\":\"registration\",\"type\":\"datetime\",\"format\":\"\",\"size\":0,\"signed\":false,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"datetime\"]},{\"$id\":\"emailVerification\",\"type\":\"boolean\",\"format\":\"\",\"size\":0,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"phoneVerification\",\"type\":\"boolean\",\"format\":\"\",\"size\":0,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"reset\",\"type\":\"boolean\",\"format\":\"\",\"size\":0,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"mfa\",\"type\":\"boolean\",\"format\":\"\",\"size\":0,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"mfaRecoveryCodes\",\"type\":\"string\",\"format\":\"\",\"size\":256,\"signed\":true,\"required\":false,\"default\":[],\"array\":true,\"filters\":[\"encrypt\"]},{\"$id\":\"authenticators\",\"type\":\"string\",\"format\":\"\",\"size\":16384,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"subQueryAuthenticators\"]},{\"$id\":\"sessions\",\"type\":\"string\",\"format\":\"\",\"size\":16384,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"subQuerySessions\"]},{\"$id\":\"tokens\",\"type\":\"string\",\"format\":\"\",\"size\":16384,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"subQueryTokens\"]},{\"$id\":\"challenges\",\"type\":\"string\",\"format\":\"\",\"size\":16384,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"subQueryChallenges\"]},{\"$id\":\"memberships\",\"type\":\"string\",\"format\":\"\",\"size\":16384,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"subQueryMemberships\"]},{\"$id\":\"targets\",\"type\":\"string\",\"format\":\"\",\"size\":16384,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"subQueryTargets\"]},{\"$id\":\"search\",\"type\":\"string\",\"format\":\"\",\"size\":16384,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"userSearch\"]},{\"$id\":\"accessedAt\",\"type\":\"datetime\",\"format\":\"\",\"size\":0,\"signed\":false,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"datetime\"]}]','[{\"$id\":\"_key_name\",\"type\":\"key\",\"attributes\":[\"name\"],\"lengths\":[256],\"orders\":[\"ASC\"]},{\"$id\":\"_key_email\",\"type\":\"unique\",\"attributes\":[\"email\"],\"lengths\":[256],\"orders\":[\"ASC\"]},{\"$id\":\"_key_phone\",\"type\":\"unique\",\"attributes\":[\"phone\"],\"lengths\":[16],\"orders\":[\"ASC\"]},{\"$id\":\"_key_status\",\"type\":\"key\",\"attributes\":[\"status\"],\"lengths\":[],\"orders\":[\"ASC\"]},{\"$id\":\"_key_passwordUpdate\",\"type\":\"key\",\"attributes\":[\"passwordUpdate\"],\"lengths\":[],\"orders\":[\"ASC\"]},{\"$id\":\"_key_registration\",\"type\":\"key\",\"attributes\":[\"registration\"],\"lengths\":[],\"orders\":[\"ASC\"]},{\"$id\":\"_key_emailVerification\",\"type\":\"key\",\"attributes\":[\"emailVerification\"],\"lengths\":[],\"orders\":[\"ASC\"]},{\"$id\":\"_key_phoneVerification\",\"type\":\"key\",\"attributes\":[\"phoneVerification\"],\"lengths\":[],\"orders\":[\"ASC\"]},{\"$id\":\"_key_search\",\"type\":\"fulltext\",\"attributes\":[\"search\"],\"lengths\":[],\"orders\":[]},{\"$id\":\"_key_accessedAt\",\"type\":\"key\",\"attributes\":[\"accessedAt\"],\"lengths\":[],\"orders\":[]}]',1),
(17,'tokens','2025-03-13 11:11:44.087','2025-03-13 11:11:44.087','[\"create(\\\"any\\\")\"]','tokens','[{\"$id\":\"userInternalId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"userId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"type\",\"type\":\"integer\",\"format\":\"\",\"size\":0,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"secret\",\"type\":\"string\",\"format\":\"\",\"size\":512,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"encrypt\"]},{\"$id\":\"expire\",\"type\":\"datetime\",\"format\":\"\",\"size\":0,\"signed\":false,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"datetime\"]},{\"$id\":\"userAgent\",\"type\":\"string\",\"format\":\"\",\"size\":16384,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"ip\",\"type\":\"string\",\"format\":\"\",\"size\":45,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]}]','[{\"$id\":\"_key_user\",\"type\":\"key\",\"attributes\":[\"userInternalId\"],\"lengths\":[255],\"orders\":[\"ASC\"]}]',1),
(18,'authenticators','2025-03-13 11:11:44.218','2025-03-13 11:11:44.218','[\"create(\\\"any\\\")\"]','authenticators','[{\"$id\":\"userInternalId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"userId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"type\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"verified\",\"type\":\"boolean\",\"format\":\"\",\"size\":0,\"signed\":true,\"required\":false,\"default\":false,\"array\":false,\"filters\":[]},{\"$id\":\"data\",\"type\":\"string\",\"format\":\"\",\"size\":65535,\"signed\":true,\"required\":false,\"default\":[],\"array\":false,\"filters\":[\"json\",\"encrypt\"]}]','[{\"$id\":\"_key_userInternalId\",\"type\":\"key\",\"attributes\":[\"userInternalId\"],\"lengths\":[255],\"orders\":[\"ASC\"]}]',1),
(19,'challenges','2025-03-13 11:11:44.317','2025-03-13 11:11:44.317','[\"create(\\\"any\\\")\"]','challenges','[{\"$id\":\"userInternalId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"userId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"type\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"token\",\"type\":\"string\",\"format\":\"\",\"size\":512,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"encrypt\"]},{\"$id\":\"code\",\"type\":\"string\",\"format\":\"\",\"size\":512,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"encrypt\"]},{\"$id\":\"expire\",\"type\":\"datetime\",\"format\":\"\",\"size\":0,\"signed\":false,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"datetime\"]}]','[{\"$id\":\"_key_user\",\"type\":\"key\",\"attributes\":[\"userInternalId\"],\"lengths\":[255],\"orders\":[\"ASC\"]}]',1),
(20,'sessions','2025-03-13 11:11:44.424','2025-03-13 11:11:44.424','[\"create(\\\"any\\\")\"]','sessions','[{\"$id\":\"userInternalId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"userId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"provider\",\"type\":\"string\",\"format\":\"\",\"size\":128,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"providerUid\",\"type\":\"string\",\"format\":\"\",\"size\":2048,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"providerAccessToken\",\"type\":\"string\",\"format\":\"\",\"size\":16384,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"encrypt\"]},{\"$id\":\"providerAccessTokenExpiry\",\"type\":\"datetime\",\"format\":\"\",\"size\":0,\"signed\":false,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"datetime\"]},{\"$id\":\"providerRefreshToken\",\"type\":\"string\",\"format\":\"\",\"size\":16384,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"encrypt\"]},{\"$id\":\"secret\",\"type\":\"string\",\"format\":\"\",\"size\":512,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"encrypt\"]},{\"$id\":\"userAgent\",\"type\":\"string\",\"format\":\"\",\"size\":16384,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"ip\",\"type\":\"string\",\"format\":\"\",\"size\":45,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"countryCode\",\"type\":\"string\",\"format\":\"\",\"size\":2,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"osCode\",\"type\":\"string\",\"format\":\"\",\"size\":256,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"osName\",\"type\":\"string\",\"format\":\"\",\"size\":256,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"osVersion\",\"type\":\"string\",\"format\":\"\",\"size\":256,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"clientType\",\"type\":\"string\",\"format\":\"\",\"size\":256,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"clientCode\",\"type\":\"string\",\"format\":\"\",\"size\":256,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"clientName\",\"type\":\"string\",\"format\":\"\",\"size\":256,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"clientVersion\",\"type\":\"string\",\"format\":\"\",\"size\":256,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"clientEngine\",\"type\":\"string\",\"format\":\"\",\"size\":256,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"clientEngineVersion\",\"type\":\"string\",\"format\":\"\",\"size\":256,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"deviceName\",\"type\":\"string\",\"format\":\"\",\"size\":256,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"deviceBrand\",\"type\":\"string\",\"format\":\"\",\"size\":256,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"deviceModel\",\"type\":\"string\",\"format\":\"\",\"size\":256,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"factors\",\"type\":\"string\",\"format\":\"\",\"size\":256,\"signed\":true,\"required\":false,\"default\":[],\"array\":true,\"filters\":[]},{\"$id\":\"expire\",\"type\":\"datetime\",\"format\":\"\",\"size\":0,\"signed\":false,\"required\":true,\"default\":null,\"array\":false,\"filters\":[\"datetime\"]},{\"$id\":\"mfaUpdatedAt\",\"type\":\"datetime\",\"format\":\"\",\"size\":0,\"signed\":false,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"datetime\"]}]','[{\"$id\":\"_key_provider_providerUid\",\"type\":\"key\",\"attributes\":[\"provider\",\"providerUid\"],\"lengths\":[128,128],\"orders\":[\"ASC\",\"ASC\"]},{\"$id\":\"_key_user\",\"type\":\"key\",\"attributes\":[\"userInternalId\"],\"lengths\":[255],\"orders\":[\"ASC\"]}]',1),
(21,'identities','2025-03-13 11:11:44.582','2025-03-13 11:11:44.582','[\"create(\\\"any\\\")\"]','identities','[{\"$id\":\"userInternalId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"userId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"provider\",\"type\":\"string\",\"format\":\"\",\"size\":128,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"providerUid\",\"type\":\"string\",\"format\":\"\",\"size\":2048,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"providerEmail\",\"type\":\"string\",\"format\":\"\",\"size\":320,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"providerAccessToken\",\"type\":\"string\",\"format\":\"\",\"size\":16384,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"encrypt\"]},{\"$id\":\"providerAccessTokenExpiry\",\"type\":\"datetime\",\"format\":\"\",\"size\":0,\"signed\":false,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"datetime\"]},{\"$id\":\"providerRefreshToken\",\"type\":\"string\",\"format\":\"\",\"size\":16384,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"encrypt\"]},{\"$id\":\"secrets\",\"type\":\"string\",\"format\":\"\",\"size\":16384,\"signed\":true,\"required\":false,\"default\":[],\"array\":false,\"filters\":[\"json\",\"encrypt\"]}]','[{\"$id\":\"_key_userInternalId_provider_providerUid\",\"type\":\"unique\",\"attributes\":[\"userInternalId\",\"provider\",\"providerUid\"],\"lengths\":[11,128,128],\"orders\":[\"ASC\",\"ASC\"]},{\"$id\":\"_key_provider_providerUid\",\"type\":\"unique\",\"attributes\":[\"provider\",\"providerUid\"],\"lengths\":[128,128],\"orders\":[\"ASC\",\"ASC\"]},{\"$id\":\"_key_userId\",\"type\":\"key\",\"attributes\":[\"userId\"],\"lengths\":[255],\"orders\":[\"ASC\"]},{\"$id\":\"_key_userInternalId\",\"type\":\"key\",\"attributes\":[\"userInternalId\"],\"lengths\":[255],\"orders\":[\"ASC\"]},{\"$id\":\"_key_provider\",\"type\":\"key\",\"attributes\":[\"provider\"],\"lengths\":[128],\"orders\":[\"ASC\"]},{\"$id\":\"_key_providerUid\",\"type\":\"key\",\"attributes\":[\"providerUid\"],\"lengths\":[255],\"orders\":[\"ASC\"]},{\"$id\":\"_key_providerEmail\",\"type\":\"key\",\"attributes\":[\"providerEmail\"],\"lengths\":[255],\"orders\":[\"ASC\"]},{\"$id\":\"_key_providerAccessTokenExpiry\",\"type\":\"key\",\"attributes\":[\"providerAccessTokenExpiry\"],\"lengths\":[],\"orders\":[\"ASC\"]}]',1),
(22,'teams','2025-03-13 11:11:44.762','2025-03-13 11:11:44.762','[\"create(\\\"any\\\")\"]','teams','[{\"$id\":\"name\",\"type\":\"string\",\"format\":\"\",\"size\":128,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"total\",\"type\":\"integer\",\"format\":\"\",\"size\":0,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"search\",\"type\":\"string\",\"format\":\"\",\"size\":16384,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"prefs\",\"type\":\"string\",\"format\":\"\",\"size\":65535,\"signed\":true,\"required\":false,\"default\":{},\"array\":false,\"filters\":[\"json\"]}]','[{\"$id\":\"_key_search\",\"type\":\"fulltext\",\"attributes\":[\"search\"],\"lengths\":[],\"orders\":[]},{\"$id\":\"_key_name\",\"type\":\"key\",\"attributes\":[\"name\"],\"lengths\":[128],\"orders\":[\"ASC\"]},{\"$id\":\"_key_total\",\"type\":\"key\",\"attributes\":[\"total\"],\"lengths\":[],\"orders\":[\"ASC\"]}]',1),
(23,'memberships','2025-03-13 11:11:44.989','2025-03-13 11:11:44.989','[\"create(\\\"any\\\")\"]','memberships','[{\"$id\":\"userInternalId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"userId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"teamInternalId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"teamId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"roles\",\"type\":\"string\",\"format\":\"\",\"size\":128,\"signed\":true,\"required\":false,\"default\":null,\"array\":true,\"filters\":[]},{\"$id\":\"invited\",\"type\":\"datetime\",\"format\":\"\",\"size\":0,\"signed\":false,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"datetime\"]},{\"$id\":\"joined\",\"type\":\"datetime\",\"format\":\"\",\"size\":0,\"signed\":false,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"datetime\"]},{\"$id\":\"confirm\",\"type\":\"boolean\",\"format\":\"\",\"size\":0,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"secret\",\"type\":\"string\",\"format\":\"\",\"size\":256,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"encrypt\"]},{\"$id\":\"search\",\"type\":\"string\",\"format\":\"\",\"size\":16384,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]}]','[{\"$id\":\"_key_unique\",\"type\":\"unique\",\"attributes\":[\"teamInternalId\",\"userInternalId\"],\"lengths\":[255,255],\"orders\":[\"ASC\",\"ASC\"]},{\"$id\":\"_key_user\",\"type\":\"key\",\"attributes\":[\"userInternalId\"],\"lengths\":[255],\"orders\":[\"ASC\"]},{\"$id\":\"_key_team\",\"type\":\"key\",\"attributes\":[\"teamInternalId\"],\"lengths\":[255],\"orders\":[\"ASC\"]},{\"$id\":\"_key_search\",\"type\":\"fulltext\",\"attributes\":[\"search\"],\"lengths\":[],\"orders\":[]},{\"$id\":\"_key_userId\",\"type\":\"key\",\"attributes\":[\"userId\"],\"lengths\":[255],\"orders\":[\"ASC\"]},{\"$id\":\"_key_teamId\",\"type\":\"key\",\"attributes\":[\"teamId\"],\"lengths\":[255],\"orders\":[\"ASC\"]},{\"$id\":\"_key_invited\",\"type\":\"key\",\"attributes\":[\"invited\"],\"lengths\":[],\"orders\":[\"ASC\"]},{\"$id\":\"_key_joined\",\"type\":\"key\",\"attributes\":[\"joined\"],\"lengths\":[],\"orders\":[\"ASC\"]},{\"$id\":\"_key_confirm\",\"type\":\"key\",\"attributes\":[\"confirm\"],\"lengths\":[],\"orders\":[\"ASC\"]}]',1),
(24,'buckets','2025-03-13 11:11:45.216','2025-03-13 11:11:45.216','[\"create(\\\"any\\\")\"]','buckets','[{\"$id\":\"enabled\",\"type\":\"boolean\",\"signed\":true,\"size\":0,\"format\":\"\",\"filters\":[],\"required\":true,\"array\":false},{\"$id\":\"name\",\"type\":\"string\",\"signed\":true,\"size\":128,\"format\":\"\",\"filters\":[],\"required\":true,\"array\":false},{\"$id\":\"fileSecurity\",\"type\":\"boolean\",\"signed\":true,\"size\":1,\"format\":\"\",\"filters\":[],\"required\":false,\"array\":false},{\"$id\":\"maximumFileSize\",\"type\":\"integer\",\"signed\":false,\"size\":8,\"format\":\"\",\"filters\":[],\"required\":true,\"array\":false},{\"$id\":\"allowedFileExtensions\",\"type\":\"string\",\"signed\":true,\"size\":64,\"format\":\"\",\"filters\":[],\"required\":true,\"array\":true},{\"$id\":\"compression\",\"type\":\"string\",\"signed\":true,\"size\":10,\"format\":\"\",\"filters\":[],\"required\":true,\"array\":false},{\"$id\":\"encryption\",\"type\":\"boolean\",\"signed\":true,\"size\":0,\"format\":\"\",\"filters\":[],\"required\":true,\"array\":false},{\"$id\":\"antivirus\",\"type\":\"boolean\",\"signed\":true,\"size\":0,\"format\":\"\",\"filters\":[],\"required\":true,\"array\":false},{\"$id\":\"search\",\"type\":\"string\",\"format\":\"\",\"size\":16384,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]}]','[{\"$id\":\"_fulltext_name\",\"type\":\"fulltext\",\"attributes\":[\"name\"],\"lengths\":[],\"orders\":[]},{\"$id\":\"_key_search\",\"type\":\"fulltext\",\"attributes\":[\"search\"],\"lengths\":[],\"orders\":[]},{\"$id\":\"_key_enabled\",\"type\":\"key\",\"attributes\":[\"enabled\"],\"lengths\":[],\"orders\":[\"ASC\"]},{\"$id\":\"_key_name\",\"type\":\"key\",\"attributes\":[\"name\"],\"lengths\":[],\"orders\":[\"ASC\"]},{\"$id\":\"_key_fileSecurity\",\"type\":\"key\",\"attributes\":[\"fileSecurity\"],\"lengths\":[],\"orders\":[\"ASC\"]},{\"$id\":\"_key_maximumFileSize\",\"type\":\"key\",\"attributes\":[\"maximumFileSize\"],\"lengths\":[],\"orders\":[\"ASC\"]},{\"$id\":\"_key_encryption\",\"type\":\"key\",\"attributes\":[\"encryption\"],\"lengths\":[],\"orders\":[\"ASC\"]},{\"$id\":\"_key_antivirus\",\"type\":\"key\",\"attributes\":[\"antivirus\"],\"lengths\":[],\"orders\":[\"ASC\"]}]',1),
(25,'stats','2025-03-13 11:11:45.337','2025-03-13 11:11:45.337','[\"create(\\\"any\\\")\"]','stats','[{\"$id\":\"metric\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"region\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"value\",\"type\":\"integer\",\"format\":\"\",\"size\":8,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"time\",\"type\":\"datetime\",\"format\":\"\",\"size\":0,\"signed\":false,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"datetime\"]},{\"$id\":\"period\",\"type\":\"string\",\"format\":\"\",\"size\":4,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]}]','[{\"$id\":\"_key_time\",\"type\":\"key\",\"attributes\":[\"time\"],\"lengths\":[],\"orders\":[\"DESC\"]},{\"$id\":\"_key_period_time\",\"type\":\"key\",\"attributes\":[\"period\",\"time\"],\"lengths\":[],\"orders\":[\"ASC\"]},{\"$id\":\"_key_metric_period_time\",\"type\":\"unique\",\"attributes\":[\"metric\",\"period\",\"time\"],\"lengths\":[],\"orders\":[\"DESC\"]}]',1),
(26,'providers','2025-03-13 11:11:45.528','2025-03-13 11:11:45.528','[\"create(\\\"any\\\")\"]','providers','[{\"$id\":\"name\",\"type\":\"string\",\"format\":\"\",\"size\":128,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"provider\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"type\",\"type\":\"string\",\"format\":\"\",\"size\":128,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"enabled\",\"type\":\"boolean\",\"signed\":true,\"size\":0,\"format\":\"\",\"filters\":[],\"required\":true,\"default\":true,\"array\":false},{\"$id\":\"credentials\",\"type\":\"string\",\"format\":\"\",\"size\":16384,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[\"json\",\"encrypt\"]},{\"$id\":\"options\",\"type\":\"string\",\"format\":\"\",\"size\":16384,\"signed\":true,\"required\":false,\"default\":[],\"array\":false,\"filters\":[\"json\"]},{\"$id\":\"search\",\"type\":\"string\",\"format\":\"\",\"size\":65535,\"signed\":true,\"required\":false,\"default\":\"\",\"array\":false,\"filters\":[\"providerSearch\"]}]','[{\"$id\":\"_key_provider\",\"type\":\"key\",\"attributes\":[\"provider\"],\"lengths\":[],\"orders\":[\"ASC\"]},{\"$id\":\"_key_name\",\"type\":\"fulltext\",\"attributes\":[\"name\"],\"lengths\":[],\"orders\":[\"ASC\"]},{\"$id\":\"_key_type\",\"type\":\"key\",\"attributes\":[\"type\"],\"lengths\":[],\"orders\":[\"ASC\"]},{\"$id\":\"_key_enabled_type\",\"type\":\"key\",\"attributes\":[\"enabled\",\"type\"],\"lengths\":[],\"orders\":[\"ASC\"]},{\"$id\":\"_key_search\",\"type\":\"fulltext\",\"attributes\":[\"search\"],\"lengths\":[],\"orders\":[]}]',1),
(27,'messages','2025-03-13 11:11:45.682','2025-03-13 11:11:45.682','[\"create(\\\"any\\\")\"]','messages','[{\"$id\":\"providerType\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"status\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":true,\"default\":\"processing\",\"array\":false,\"filters\":[]},{\"$id\":\"data\",\"type\":\"string\",\"format\":\"\",\"size\":65535,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[\"json\"]},{\"$id\":\"topics\",\"type\":\"string\",\"format\":\"\",\"size\":21845,\"signed\":true,\"required\":false,\"default\":[],\"array\":true,\"filters\":[]},{\"$id\":\"users\",\"type\":\"string\",\"format\":\"\",\"size\":21845,\"signed\":true,\"required\":false,\"default\":[],\"array\":true,\"filters\":[]},{\"$id\":\"targets\",\"type\":\"string\",\"format\":\"\",\"size\":21845,\"signed\":true,\"required\":false,\"default\":[],\"array\":true,\"filters\":[]},{\"$id\":\"scheduledAt\",\"type\":\"datetime\",\"format\":\"\",\"size\":0,\"signed\":false,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"datetime\"]},{\"$id\":\"scheduleInternalId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"scheduleId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"deliveredAt\",\"type\":\"datetime\",\"format\":\"\",\"size\":0,\"signed\":false,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"datetime\"]},{\"$id\":\"deliveryErrors\",\"type\":\"string\",\"format\":\"\",\"size\":65535,\"signed\":true,\"required\":false,\"default\":null,\"array\":true,\"filters\":[]},{\"$id\":\"deliveredTotal\",\"type\":\"integer\",\"format\":\"\",\"size\":0,\"signed\":true,\"required\":false,\"default\":0,\"array\":false,\"filters\":[]},{\"$id\":\"search\",\"type\":\"string\",\"format\":\"\",\"size\":16384,\"signed\":true,\"required\":false,\"default\":\"\",\"array\":false,\"filters\":[\"messageSearch\"]}]','[{\"$id\":\"_key_search\",\"type\":\"fulltext\",\"attributes\":[\"search\"],\"lengths\":[],\"orders\":[]}]',1),
(28,'topics','2025-03-13 11:11:45.842','2025-03-13 11:11:45.842','[\"create(\\\"any\\\")\"]','topics','[{\"$id\":\"name\",\"type\":\"string\",\"format\":\"\",\"size\":128,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"subscribe\",\"type\":\"string\",\"format\":\"\",\"size\":128,\"signed\":true,\"required\":false,\"default\":null,\"array\":true,\"filters\":[]},{\"$id\":\"emailTotal\",\"type\":\"integer\",\"format\":\"\",\"size\":0,\"signed\":true,\"required\":false,\"default\":0,\"array\":false,\"filters\":[]},{\"$id\":\"smsTotal\",\"type\":\"integer\",\"format\":\"\",\"size\":0,\"signed\":true,\"required\":false,\"default\":0,\"array\":false,\"filters\":[]},{\"$id\":\"pushTotal\",\"type\":\"integer\",\"format\":\"\",\"size\":0,\"signed\":true,\"required\":false,\"default\":0,\"array\":false,\"filters\":[]},{\"$id\":\"targets\",\"type\":\"string\",\"format\":\"\",\"size\":16384,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"subQueryTopicTargets\"]},{\"$id\":\"search\",\"type\":\"string\",\"format\":\"\",\"size\":16384,\"signed\":true,\"required\":false,\"default\":\"\",\"array\":false,\"filters\":[\"topicSearch\"]}]','[{\"$id\":\"_key_name\",\"type\":\"fulltext\",\"attributes\":[\"name\"],\"lengths\":[],\"orders\":[]},{\"$id\":\"_key_search\",\"type\":\"fulltext\",\"attributes\":[\"search\"],\"lengths\":[],\"orders\":[\"ASC\"]}]',1),
(29,'subscribers','2025-03-13 11:11:46.042','2025-03-13 11:11:46.042','[\"create(\\\"any\\\")\"]','subscribers','[{\"$id\":\"targetId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"targetInternalId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"userId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"userInternalId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"topicId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"topicInternalId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"providerType\",\"type\":\"string\",\"format\":\"\",\"size\":128,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"search\",\"type\":\"string\",\"format\":\"\",\"size\":16384,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]}]','[{\"$id\":\"_key_targetId\",\"type\":\"key\",\"attributes\":[\"targetId\"],\"lengths\":[],\"orders\":[]},{\"$id\":\"_key_targetInternalId\",\"type\":\"key\",\"attributes\":[\"targetInternalId\"],\"lengths\":[],\"orders\":[]},{\"$id\":\"_key_userId\",\"type\":\"key\",\"attributes\":[\"userId\"],\"lengths\":[],\"orders\":[]},{\"$id\":\"_key_userInternalId\",\"type\":\"key\",\"attributes\":[\"userInternalId\"],\"lengths\":[],\"orders\":[]},{\"$id\":\"_key_topicId\",\"type\":\"key\",\"attributes\":[\"topicId\"],\"lengths\":[],\"orders\":[]},{\"$id\":\"_key_topicInternalId\",\"type\":\"key\",\"attributes\":[\"topicInternalId\"],\"lengths\":[],\"orders\":[]},{\"$id\":\"_unique_target_topic\",\"type\":\"unique\",\"attributes\":[\"targetInternalId\",\"topicInternalId\"],\"lengths\":[],\"orders\":[]},{\"$id\":\"_fulltext_search\",\"type\":\"fulltext\",\"attributes\":[\"search\"],\"lengths\":[],\"orders\":[]}]',1),
(30,'targets','2025-03-13 11:11:46.191','2025-03-13 11:11:46.191','[\"create(\\\"any\\\")\"]','targets','[{\"$id\":\"userId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"userInternalId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"sessionId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"sessionInternalId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"providerType\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"providerId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"providerInternalId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"identifier\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":true,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"name\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"expired\",\"type\":\"boolean\",\"format\":\"\",\"size\":0,\"signed\":true,\"required\":false,\"default\":false,\"array\":false,\"filters\":[]}]','[{\"$id\":\"_key_userId\",\"type\":\"key\",\"attributes\":[\"userId\"],\"lengths\":[],\"orders\":[\"ASC\"]},{\"$id\":\"_key_userInternalId\",\"type\":\"key\",\"attributes\":[\"userInternalId\"],\"lengths\":[],\"orders\":[\"ASC\"]},{\"$id\":\"_key_providerId\",\"type\":\"key\",\"attributes\":[\"providerId\"],\"lengths\":[],\"orders\":[]},{\"$id\":\"_key_providerInternalId\",\"type\":\"key\",\"attributes\":[\"providerInternalId\"],\"lengths\":[],\"orders\":[]},{\"$id\":\"_key_identifier\",\"type\":\"unique\",\"attributes\":[\"identifier\"],\"lengths\":[],\"orders\":[]}]',1),
(31,'bucket_1','2025-03-13 11:11:46.401','2025-03-13 11:11:46.401','[\"create(\\\"any\\\")\"]','bucket_1','[{\"array\":false,\"$id\":\"bucketId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"filters\":[]},{\"array\":false,\"$id\":\"bucketInternalId\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":true,\"default\":null,\"filters\":[]},{\"$id\":\"name\",\"type\":\"string\",\"format\":\"\",\"size\":2048,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"path\",\"type\":\"string\",\"format\":\"\",\"size\":2048,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"signature\",\"type\":\"string\",\"format\":\"\",\"size\":2048,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"mimeType\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"metadata\",\"type\":\"string\",\"format\":\"\",\"size\":75000,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[\"json\"]},{\"$id\":\"sizeOriginal\",\"type\":\"integer\",\"format\":\"\",\"size\":8,\"signed\":false,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"sizeActual\",\"type\":\"integer\",\"format\":\"\",\"size\":8,\"signed\":false,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"algorithm\",\"type\":\"string\",\"format\":\"\",\"size\":255,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"comment\",\"type\":\"string\",\"format\":\"\",\"size\":2048,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"openSSLVersion\",\"type\":\"string\",\"format\":\"\",\"size\":64,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"openSSLCipher\",\"type\":\"string\",\"format\":\"\",\"size\":64,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"openSSLTag\",\"type\":\"string\",\"format\":\"\",\"size\":2048,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"openSSLIV\",\"type\":\"string\",\"format\":\"\",\"size\":2048,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"chunksTotal\",\"type\":\"integer\",\"format\":\"\",\"size\":0,\"signed\":false,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"chunksUploaded\",\"type\":\"integer\",\"format\":\"\",\"size\":0,\"signed\":false,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]},{\"$id\":\"search\",\"type\":\"string\",\"format\":\"\",\"size\":16384,\"signed\":true,\"required\":false,\"default\":null,\"array\":false,\"filters\":[]}]','[{\"$id\":\"_key_search\",\"type\":\"fulltext\",\"attributes\":[\"search\"],\"lengths\":[],\"orders\":[]},{\"$id\":\"_key_bucket\",\"type\":\"key\",\"attributes\":[\"bucketId\"],\"lengths\":[255],\"orders\":[\"ASC\"]},{\"$id\":\"_key_name\",\"type\":\"key\",\"attributes\":[\"name\"],\"lengths\":[256],\"orders\":[\"ASC\"]},{\"$id\":\"_key_signature\",\"type\":\"key\",\"attributes\":[\"signature\"],\"lengths\":[256],\"orders\":[\"ASC\"]},{\"$id\":\"_key_mimeType\",\"type\":\"key\",\"attributes\":[\"mimeType\"],\"lengths\":[],\"orders\":[\"ASC\"]},{\"$id\":\"_key_sizeOriginal\",\"type\":\"key\",\"attributes\":[\"sizeOriginal\"],\"lengths\":[],\"orders\":[\"ASC\"]},{\"$id\":\"_key_chunksTotal\",\"type\":\"key\",\"attributes\":[\"chunksTotal\"],\"lengths\":[],\"orders\":[\"ASC\"]},{\"$id\":\"_key_chunksUploaded\",\"type\":\"key\",\"attributes\":[\"chunksUploaded\"],\"lengths\":[],\"orders\":[\"ASC\"]}]',1);
/*!40000 ALTER TABLE `_console__metadata` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_console__metadata_perms`
--

DROP TABLE IF EXISTS `_console__metadata_perms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_console__metadata_perms` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_type` varchar(12) NOT NULL,
  `_permission` varchar(255) NOT NULL,
  `_document` varchar(255) NOT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_index1` (`_document`,`_type`,`_permission`),
  KEY `_permission` (`_permission`,`_type`)
) ENGINE=InnoDB AUTO_INCREMENT=32 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_console__metadata_perms`
--

LOCK TABLES `_console__metadata_perms` WRITE;
/*!40000 ALTER TABLE `_console__metadata_perms` DISABLE KEYS */;
INSERT INTO `_console__metadata_perms` VALUES
(2,'create','any','abuse'),
(1,'create','any','audit'),
(18,'create','any','authenticators'),
(24,'create','any','buckets'),
(31,'create','any','bucket_1'),
(15,'create','any','cache'),
(8,'create','any','certificates'),
(19,'create','any','challenges'),
(21,'create','any','identities'),
(11,'create','any','installations'),
(6,'create','any','keys'),
(23,'create','any','memberships'),
(27,'create','any','messages'),
(5,'create','any','platforms'),
(3,'create','any','projects'),
(26,'create','any','providers'),
(9,'create','any','realtime'),
(12,'create','any','repositories'),
(10,'create','any','rules'),
(4,'create','any','schedules'),
(20,'create','any','sessions'),
(25,'create','any','stats'),
(29,'create','any','subscribers'),
(30,'create','any','targets'),
(22,'create','any','teams'),
(17,'create','any','tokens'),
(28,'create','any','topics'),
(16,'create','any','users'),
(14,'create','any','vcsCommentLocks'),
(13,'create','any','vcsComments'),
(7,'create','any','webhooks');
/*!40000 ALTER TABLE `_console__metadata_perms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_console_abuse`
--

DROP TABLE IF EXISTS `_console_abuse`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_console_abuse` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_uid` varchar(255) NOT NULL,
  `_createdAt` datetime(3) DEFAULT NULL,
  `_updatedAt` datetime(3) DEFAULT NULL,
  `_permissions` mediumtext DEFAULT NULL,
  `key` varchar(255) DEFAULT NULL,
  `time` datetime(3) DEFAULT NULL,
  `count` bigint(20) unsigned DEFAULT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_uid` (`_uid`),
  UNIQUE KEY `unique1` (`key`,`time`),
  KEY `index2` (`time`),
  KEY `_created_at` (`_createdAt`),
  KEY `_updated_at` (`_updatedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_console_abuse`
--

LOCK TABLES `_console_abuse` WRITE;
/*!40000 ALTER TABLE `_console_abuse` DISABLE KEYS */;
/*!40000 ALTER TABLE `_console_abuse` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_console_abuse_perms`
--

DROP TABLE IF EXISTS `_console_abuse_perms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_console_abuse_perms` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_type` varchar(12) NOT NULL,
  `_permission` varchar(255) NOT NULL,
  `_document` varchar(255) NOT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_index1` (`_document`,`_type`,`_permission`),
  KEY `_permission` (`_permission`,`_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_console_abuse_perms`
--

LOCK TABLES `_console_abuse_perms` WRITE;
/*!40000 ALTER TABLE `_console_abuse_perms` DISABLE KEYS */;
/*!40000 ALTER TABLE `_console_abuse_perms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_console_audit`
--

DROP TABLE IF EXISTS `_console_audit`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_console_audit` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_uid` varchar(255) NOT NULL,
  `_createdAt` datetime(3) DEFAULT NULL,
  `_updatedAt` datetime(3) DEFAULT NULL,
  `_permissions` mediumtext DEFAULT NULL,
  `userId` varchar(255) DEFAULT NULL,
  `event` varchar(255) DEFAULT NULL,
  `resource` varchar(255) DEFAULT NULL,
  `userAgent` text DEFAULT NULL,
  `ip` varchar(45) DEFAULT NULL,
  `location` varchar(45) DEFAULT NULL,
  `time` datetime(3) DEFAULT NULL,
  `data` longtext DEFAULT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_uid` (`_uid`),
  KEY `index2` (`event`),
  KEY `index4` (`userId`,`event`),
  KEY `index5` (`resource`,`event`),
  KEY `index-time` (`time` DESC),
  KEY `_created_at` (`_createdAt`),
  KEY `_updated_at` (`_updatedAt`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_console_audit`
--

LOCK TABLES `_console_audit` WRITE;
/*!40000 ALTER TABLE `_console_audit` DISABLE KEYS */;
INSERT INTO `_console_audit` VALUES
(1,'67dc088c9933c6cc90ff','2025-03-20 12:22:36.627','2025-03-20 12:22:36.627','[]','1','user.create','user/67dc088c00188f3ed87b','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36','172.19.0.1','','2025-03-20 12:22:36.626','{\"userId\":\"67dc088c00188f3ed87b\",\"userName\":\"asdf\",\"userEmail\":\"asdf@asdf.de\",\"mode\":\"default\",\"data\":{\"$id\":\"67dc088c00188f3ed87b\",\"$createdAt\":\"2025-03-20T12:22:36.584+00:00\",\"$updatedAt\":\"2025-03-20T12:22:36.584+00:00\",\"name\":\"asdf\",\"registration\":\"2025-03-20T12:22:36.583+00:00\",\"status\":true,\"labels\":[],\"passwordUpdate\":\"2025-03-20T12:22:36.583+00:00\",\"email\":\"asdf@asdf.de\",\"phone\":\"\",\"emailVerification\":false,\"phoneVerification\":false,\"mfa\":false,\"prefs\":[],\"targets\":[{\"$id\":\"67dc088c94eae6938ae5\",\"$createdAt\":\"2025-03-20T12:22:36.609+00:00\",\"$updatedAt\":\"2025-03-20T12:22:36.609+00:00\",\"name\":\"\",\"userId\":\"67dc088c00188f3ed87b\",\"providerId\":null,\"providerType\":\"email\",\"identifier\":\"asdf@asdf.de\",\"expired\":false}],\"accessedAt\":\"2025-03-20T12:22:36.583+00:00\"}}'),
(2,'67dc088cd24795ac7efb','2025-03-20 12:22:36.861','2025-03-20 12:22:36.861','[]','1','session.create','user/67dc088c00188f3ed87b','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36','172.19.0.1','','2025-03-20 12:22:36.861','{\"userId\":\"67dc088c00188f3ed87b\",\"userName\":\"asdf\",\"userEmail\":\"asdf@asdf.de\",\"mode\":\"default\",\"data\":{\"$id\":\"67dc088cc00a096b8bf0\",\"$createdAt\":\"2025-03-20T12:22:36.855+00:00\",\"$updatedAt\":\"2025-03-20T12:22:36.855+00:00\",\"userId\":\"67dc088c00188f3ed87b\",\"expire\":\"2026-03-20T12:22:36.786+00:00\",\"provider\":\"email\",\"providerUid\":\"asdf@asdf.de\",\"providerAccessToken\":\"\",\"providerAccessTokenExpiry\":\"\",\"providerRefreshToken\":\"\",\"ip\":\"172.19.0.1\",\"osCode\":\"LIN\",\"osName\":\"GNU\\/Linux\",\"osVersion\":\"\",\"clientType\":\"browser\",\"clientCode\":\"CH\",\"clientName\":\"Chrome\",\"clientVersion\":\"134.0\",\"clientEngine\":\"Blink\",\"clientEngineVersion\":\"134.0.0.0\",\"deviceName\":\"desktop\",\"deviceBrand\":\"\",\"deviceModel\":\"\",\"countryCode\":\"--\",\"countryName\":\"Unknown\",\"current\":true,\"factors\":[\"password\"],\"secret\":\"\",\"mfaUpdatedAt\":\"\"}}'),
(3,'67dc089088f65b473a7c','2025-03-20 12:22:40.560','2025-03-20 12:22:40.560','[]','1','team.create','team/67dc089000215613fd29','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36','172.19.0.1','','2025-03-20 12:22:40.560','{\"userId\":\"67dc088c00188f3ed87b\",\"userName\":\"asdf\",\"userEmail\":\"asdf@asdf.de\",\"mode\":\"default\",\"data\":{\"$id\":\"67dc089000215613fd29\",\"$createdAt\":\"2025-03-20T12:22:40.540+00:00\",\"$updatedAt\":\"2025-03-20T12:22:40.540+00:00\",\"name\":\"asdf\",\"total\":1,\"prefs\":[]}}'),
(4,'67dc08909f132fee2d20','2025-03-20 12:22:40.651','2025-03-20 12:22:40.651','[]','1','user.update','user/67dc088c00188f3ed87b','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36','172.19.0.1','','2025-03-20 12:22:40.651','{\"userId\":\"67dc088c00188f3ed87b\",\"userName\":\"asdf\",\"userEmail\":\"asdf@asdf.de\",\"mode\":\"default\",\"data\":{\"$id\":\"67dc088c00188f3ed87b\",\"$createdAt\":\"2025-03-20T12:22:36.584+00:00\",\"$updatedAt\":\"2025-03-20T12:22:40.634+00:00\",\"name\":\"asdf\",\"registration\":\"2025-03-20T12:22:36.583+00:00\",\"status\":true,\"labels\":[],\"passwordUpdate\":\"2025-03-20T12:22:36.583+00:00\",\"email\":\"asdf@asdf.de\",\"phone\":\"\",\"emailVerification\":false,\"phoneVerification\":false,\"mfa\":false,\"prefs\":{\"organization\":\"67dc089000215613fd29\"},\"targets\":[{\"$id\":\"67dc088c94eae6938ae5\",\"$createdAt\":\"2025-03-20T12:22:36.609+00:00\",\"$updatedAt\":\"2025-03-20T12:22:36.609+00:00\",\"name\":\"\",\"userId\":\"67dc088c00188f3ed87b\",\"providerId\":null,\"providerType\":\"email\",\"identifier\":\"asdf@asdf.de\",\"expired\":false}],\"accessedAt\":\"2025-03-20T12:22:36.583+00:00\"}}'),
(5,'67dc43abc9ce3e9b2cb3','2025-03-20 16:34:51.826','2025-03-20 16:34:51.826','[]','1','user.update','user/67dc088c00188f3ed87b','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36','172.19.0.1','','2025-03-20 16:34:51.825','{\"userId\":\"67dc088c00188f3ed87b\",\"userName\":\"asdf\",\"userEmail\":\"asdf@asdf.de\",\"mode\":\"default\",\"data\":{\"$id\":\"67dc088c00188f3ed87b\",\"$createdAt\":\"2025-03-20T12:22:36.584+00:00\",\"$updatedAt\":\"2025-03-20T16:34:51.793+00:00\",\"name\":\"asdf\",\"registration\":\"2025-03-20T12:22:36.583+00:00\",\"status\":true,\"labels\":[],\"passwordUpdate\":\"2025-03-20T12:22:36.583+00:00\",\"email\":\"asdf@asdf.de\",\"phone\":\"\",\"emailVerification\":false,\"phoneVerification\":false,\"mfa\":false,\"prefs\":{\"organization\":\"67dc089000215613fd29\"},\"targets\":[{\"$id\":\"67dc088c94eae6938ae5\",\"$createdAt\":\"2025-03-20T12:22:36.609+00:00\",\"$updatedAt\":\"2025-03-20T12:22:36.609+00:00\",\"name\":\"\",\"userId\":\"67dc088c00188f3ed87b\",\"providerId\":null,\"providerType\":\"email\",\"identifier\":\"asdf@asdf.de\",\"expired\":false}],\"accessedAt\":\"2025-03-20T12:22:36.583+00:00\"}}');
/*!40000 ALTER TABLE `_console_audit` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_console_audit_perms`
--

DROP TABLE IF EXISTS `_console_audit_perms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_console_audit_perms` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_type` varchar(12) NOT NULL,
  `_permission` varchar(255) NOT NULL,
  `_document` varchar(255) NOT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_index1` (`_document`,`_type`,`_permission`),
  KEY `_permission` (`_permission`,`_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_console_audit_perms`
--

LOCK TABLES `_console_audit_perms` WRITE;
/*!40000 ALTER TABLE `_console_audit_perms` DISABLE KEYS */;
/*!40000 ALTER TABLE `_console_audit_perms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_console_authenticators`
--

DROP TABLE IF EXISTS `_console_authenticators`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_console_authenticators` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_uid` varchar(255) NOT NULL,
  `_createdAt` datetime(3) DEFAULT NULL,
  `_updatedAt` datetime(3) DEFAULT NULL,
  `_permissions` mediumtext DEFAULT NULL,
  `userInternalId` varchar(255) DEFAULT NULL,
  `userId` varchar(255) DEFAULT NULL,
  `type` varchar(255) DEFAULT NULL,
  `verified` tinyint(1) DEFAULT NULL,
  `data` text DEFAULT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_uid` (`_uid`),
  KEY `_key_userInternalId` (`userInternalId`),
  KEY `_created_at` (`_createdAt`),
  KEY `_updated_at` (`_updatedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_console_authenticators`
--

LOCK TABLES `_console_authenticators` WRITE;
/*!40000 ALTER TABLE `_console_authenticators` DISABLE KEYS */;
/*!40000 ALTER TABLE `_console_authenticators` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_console_authenticators_perms`
--

DROP TABLE IF EXISTS `_console_authenticators_perms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_console_authenticators_perms` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_type` varchar(12) NOT NULL,
  `_permission` varchar(255) NOT NULL,
  `_document` varchar(255) NOT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_index1` (`_document`,`_type`,`_permission`),
  KEY `_permission` (`_permission`,`_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_console_authenticators_perms`
--

LOCK TABLES `_console_authenticators_perms` WRITE;
/*!40000 ALTER TABLE `_console_authenticators_perms` DISABLE KEYS */;
/*!40000 ALTER TABLE `_console_authenticators_perms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_console_bucket_1`
--

DROP TABLE IF EXISTS `_console_bucket_1`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_console_bucket_1` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_uid` varchar(255) NOT NULL,
  `_createdAt` datetime(3) DEFAULT NULL,
  `_updatedAt` datetime(3) DEFAULT NULL,
  `_permissions` mediumtext DEFAULT NULL,
  `bucketId` varchar(255) DEFAULT NULL,
  `bucketInternalId` varchar(255) DEFAULT NULL,
  `name` varchar(2048) DEFAULT NULL,
  `path` varchar(2048) DEFAULT NULL,
  `signature` varchar(2048) DEFAULT NULL,
  `mimeType` varchar(255) DEFAULT NULL,
  `metadata` mediumtext DEFAULT NULL,
  `sizeOriginal` bigint(20) unsigned DEFAULT NULL,
  `sizeActual` bigint(20) unsigned DEFAULT NULL,
  `algorithm` varchar(255) DEFAULT NULL,
  `comment` varchar(2048) DEFAULT NULL,
  `openSSLVersion` varchar(64) DEFAULT NULL,
  `openSSLCipher` varchar(64) DEFAULT NULL,
  `openSSLTag` varchar(2048) DEFAULT NULL,
  `openSSLIV` varchar(2048) DEFAULT NULL,
  `chunksTotal` int(10) unsigned DEFAULT NULL,
  `chunksUploaded` int(10) unsigned DEFAULT NULL,
  `search` text DEFAULT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_uid` (`_uid`),
  KEY `_key_bucket` (`bucketId`),
  KEY `_key_name` (`name`(256)),
  KEY `_key_signature` (`signature`(256)),
  KEY `_key_mimeType` (`mimeType`),
  KEY `_key_sizeOriginal` (`sizeOriginal`),
  KEY `_key_chunksTotal` (`chunksTotal`),
  KEY `_key_chunksUploaded` (`chunksUploaded`),
  KEY `_created_at` (`_createdAt`),
  KEY `_updated_at` (`_updatedAt`),
  FULLTEXT KEY `_key_search` (`search`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_console_bucket_1`
--

LOCK TABLES `_console_bucket_1` WRITE;
/*!40000 ALTER TABLE `_console_bucket_1` DISABLE KEYS */;
/*!40000 ALTER TABLE `_console_bucket_1` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_console_bucket_1_perms`
--

DROP TABLE IF EXISTS `_console_bucket_1_perms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_console_bucket_1_perms` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_type` varchar(12) NOT NULL,
  `_permission` varchar(255) NOT NULL,
  `_document` varchar(255) NOT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_index1` (`_document`,`_type`,`_permission`),
  KEY `_permission` (`_permission`,`_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_console_bucket_1_perms`
--

LOCK TABLES `_console_bucket_1_perms` WRITE;
/*!40000 ALTER TABLE `_console_bucket_1_perms` DISABLE KEYS */;
/*!40000 ALTER TABLE `_console_bucket_1_perms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_console_buckets`
--

DROP TABLE IF EXISTS `_console_buckets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_console_buckets` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_uid` varchar(255) NOT NULL,
  `_createdAt` datetime(3) DEFAULT NULL,
  `_updatedAt` datetime(3) DEFAULT NULL,
  `_permissions` mediumtext DEFAULT NULL,
  `enabled` tinyint(1) DEFAULT NULL,
  `name` varchar(128) DEFAULT NULL,
  `fileSecurity` tinyint(1) DEFAULT NULL,
  `maximumFileSize` bigint(20) unsigned DEFAULT NULL,
  `allowedFileExtensions` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`allowedFileExtensions`)),
  `compression` varchar(10) DEFAULT NULL,
  `encryption` tinyint(1) DEFAULT NULL,
  `antivirus` tinyint(1) DEFAULT NULL,
  `search` text DEFAULT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_uid` (`_uid`),
  KEY `_key_enabled` (`enabled`),
  KEY `_key_name` (`name`),
  KEY `_key_fileSecurity` (`fileSecurity`),
  KEY `_key_maximumFileSize` (`maximumFileSize`),
  KEY `_key_encryption` (`encryption`),
  KEY `_key_antivirus` (`antivirus`),
  KEY `_created_at` (`_createdAt`),
  KEY `_updated_at` (`_updatedAt`),
  FULLTEXT KEY `_fulltext_name` (`name`),
  FULLTEXT KEY `_key_search` (`search`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_console_buckets`
--

LOCK TABLES `_console_buckets` WRITE;
/*!40000 ALTER TABLE `_console_buckets` DISABLE KEYS */;
INSERT INTO `_console_buckets` VALUES
(1,'default','2025-03-13 11:11:46.203','2025-03-13 11:11:46.203','[\"create(\\\"any\\\")\",\"read(\\\"any\\\")\",\"update(\\\"any\\\")\",\"delete(\\\"any\\\")\"]',1,'Default',1,30000000,'[]','gzip',1,1,'buckets Default');
/*!40000 ALTER TABLE `_console_buckets` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_console_buckets_perms`
--

DROP TABLE IF EXISTS `_console_buckets_perms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_console_buckets_perms` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_type` varchar(12) NOT NULL,
  `_permission` varchar(255) NOT NULL,
  `_document` varchar(255) NOT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_index1` (`_document`,`_type`,`_permission`),
  KEY `_permission` (`_permission`,`_type`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_console_buckets_perms`
--

LOCK TABLES `_console_buckets_perms` WRITE;
/*!40000 ALTER TABLE `_console_buckets_perms` DISABLE KEYS */;
INSERT INTO `_console_buckets_perms` VALUES
(1,'create','any','default'),
(4,'delete','any','default'),
(2,'read','any','default'),
(3,'update','any','default');
/*!40000 ALTER TABLE `_console_buckets_perms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_console_cache`
--

DROP TABLE IF EXISTS `_console_cache`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_console_cache` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_uid` varchar(255) NOT NULL,
  `_createdAt` datetime(3) DEFAULT NULL,
  `_updatedAt` datetime(3) DEFAULT NULL,
  `_permissions` mediumtext DEFAULT NULL,
  `resource` varchar(255) DEFAULT NULL,
  `resourceType` varchar(255) DEFAULT NULL,
  `mimeType` varchar(255) DEFAULT NULL,
  `accessedAt` datetime(3) DEFAULT NULL,
  `signature` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_uid` (`_uid`),
  KEY `_key_accessedAt` (`accessedAt`),
  KEY `_key_resource` (`resource`),
  KEY `_created_at` (`_createdAt`),
  KEY `_updated_at` (`_updatedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_console_cache`
--

LOCK TABLES `_console_cache` WRITE;
/*!40000 ALTER TABLE `_console_cache` DISABLE KEYS */;
/*!40000 ALTER TABLE `_console_cache` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_console_cache_perms`
--

DROP TABLE IF EXISTS `_console_cache_perms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_console_cache_perms` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_type` varchar(12) NOT NULL,
  `_permission` varchar(255) NOT NULL,
  `_document` varchar(255) NOT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_index1` (`_document`,`_type`,`_permission`),
  KEY `_permission` (`_permission`,`_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_console_cache_perms`
--

LOCK TABLES `_console_cache_perms` WRITE;
/*!40000 ALTER TABLE `_console_cache_perms` DISABLE KEYS */;
/*!40000 ALTER TABLE `_console_cache_perms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_console_certificates`
--

DROP TABLE IF EXISTS `_console_certificates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_console_certificates` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_uid` varchar(255) NOT NULL,
  `_createdAt` datetime(3) DEFAULT NULL,
  `_updatedAt` datetime(3) DEFAULT NULL,
  `_permissions` mediumtext DEFAULT NULL,
  `domain` varchar(255) DEFAULT NULL,
  `issueDate` datetime(3) DEFAULT NULL,
  `renewDate` datetime(3) DEFAULT NULL,
  `attempts` int(11) DEFAULT NULL,
  `logs` mediumtext DEFAULT NULL,
  `updated` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_uid` (`_uid`),
  KEY `_key_domain` (`domain`),
  KEY `_created_at` (`_createdAt`),
  KEY `_updated_at` (`_updatedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_console_certificates`
--

LOCK TABLES `_console_certificates` WRITE;
/*!40000 ALTER TABLE `_console_certificates` DISABLE KEYS */;
/*!40000 ALTER TABLE `_console_certificates` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_console_certificates_perms`
--

DROP TABLE IF EXISTS `_console_certificates_perms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_console_certificates_perms` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_type` varchar(12) NOT NULL,
  `_permission` varchar(255) NOT NULL,
  `_document` varchar(255) NOT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_index1` (`_document`,`_type`,`_permission`),
  KEY `_permission` (`_permission`,`_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_console_certificates_perms`
--

LOCK TABLES `_console_certificates_perms` WRITE;
/*!40000 ALTER TABLE `_console_certificates_perms` DISABLE KEYS */;
/*!40000 ALTER TABLE `_console_certificates_perms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_console_challenges`
--

DROP TABLE IF EXISTS `_console_challenges`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_console_challenges` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_uid` varchar(255) NOT NULL,
  `_createdAt` datetime(3) DEFAULT NULL,
  `_updatedAt` datetime(3) DEFAULT NULL,
  `_permissions` mediumtext DEFAULT NULL,
  `userInternalId` varchar(255) DEFAULT NULL,
  `userId` varchar(255) DEFAULT NULL,
  `type` varchar(255) DEFAULT NULL,
  `token` varchar(512) DEFAULT NULL,
  `code` varchar(512) DEFAULT NULL,
  `expire` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_uid` (`_uid`),
  KEY `_key_user` (`userInternalId`),
  KEY `_created_at` (`_createdAt`),
  KEY `_updated_at` (`_updatedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_console_challenges`
--

LOCK TABLES `_console_challenges` WRITE;
/*!40000 ALTER TABLE `_console_challenges` DISABLE KEYS */;
/*!40000 ALTER TABLE `_console_challenges` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_console_challenges_perms`
--

DROP TABLE IF EXISTS `_console_challenges_perms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_console_challenges_perms` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_type` varchar(12) NOT NULL,
  `_permission` varchar(255) NOT NULL,
  `_document` varchar(255) NOT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_index1` (`_document`,`_type`,`_permission`),
  KEY `_permission` (`_permission`,`_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_console_challenges_perms`
--

LOCK TABLES `_console_challenges_perms` WRITE;
/*!40000 ALTER TABLE `_console_challenges_perms` DISABLE KEYS */;
/*!40000 ALTER TABLE `_console_challenges_perms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_console_identities`
--

DROP TABLE IF EXISTS `_console_identities`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_console_identities` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_uid` varchar(255) NOT NULL,
  `_createdAt` datetime(3) DEFAULT NULL,
  `_updatedAt` datetime(3) DEFAULT NULL,
  `_permissions` mediumtext DEFAULT NULL,
  `userInternalId` varchar(255) DEFAULT NULL,
  `userId` varchar(255) DEFAULT NULL,
  `provider` varchar(128) DEFAULT NULL,
  `providerUid` varchar(2048) DEFAULT NULL,
  `providerEmail` varchar(320) DEFAULT NULL,
  `providerAccessToken` text DEFAULT NULL,
  `providerAccessTokenExpiry` datetime(3) DEFAULT NULL,
  `providerRefreshToken` text DEFAULT NULL,
  `secrets` text DEFAULT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_uid` (`_uid`),
  UNIQUE KEY `_key_userInternalId_provider_providerUid` (`userInternalId`(11),`provider`,`providerUid`(128)),
  UNIQUE KEY `_key_provider_providerUid` (`provider`,`providerUid`(128)),
  KEY `_key_userId` (`userId`),
  KEY `_key_userInternalId` (`userInternalId`),
  KEY `_key_provider` (`provider`),
  KEY `_key_providerUid` (`providerUid`(255)),
  KEY `_key_providerEmail` (`providerEmail`(255)),
  KEY `_key_providerAccessTokenExpiry` (`providerAccessTokenExpiry`),
  KEY `_created_at` (`_createdAt`),
  KEY `_updated_at` (`_updatedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_console_identities`
--

LOCK TABLES `_console_identities` WRITE;
/*!40000 ALTER TABLE `_console_identities` DISABLE KEYS */;
/*!40000 ALTER TABLE `_console_identities` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_console_identities_perms`
--

DROP TABLE IF EXISTS `_console_identities_perms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_console_identities_perms` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_type` varchar(12) NOT NULL,
  `_permission` varchar(255) NOT NULL,
  `_document` varchar(255) NOT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_index1` (`_document`,`_type`,`_permission`),
  KEY `_permission` (`_permission`,`_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_console_identities_perms`
--

LOCK TABLES `_console_identities_perms` WRITE;
/*!40000 ALTER TABLE `_console_identities_perms` DISABLE KEYS */;
/*!40000 ALTER TABLE `_console_identities_perms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_console_installations`
--

DROP TABLE IF EXISTS `_console_installations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_console_installations` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_uid` varchar(255) NOT NULL,
  `_createdAt` datetime(3) DEFAULT NULL,
  `_updatedAt` datetime(3) DEFAULT NULL,
  `_permissions` mediumtext DEFAULT NULL,
  `projectId` varchar(255) DEFAULT NULL,
  `projectInternalId` varchar(255) DEFAULT NULL,
  `providerInstallationId` varchar(255) DEFAULT NULL,
  `organization` varchar(255) DEFAULT NULL,
  `provider` varchar(255) DEFAULT NULL,
  `personal` tinyint(1) DEFAULT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_uid` (`_uid`),
  KEY `_key_projectInternalId` (`projectInternalId`),
  KEY `_key_projectId` (`projectId`),
  KEY `_key_providerInstallationId` (`providerInstallationId`),
  KEY `_created_at` (`_createdAt`),
  KEY `_updated_at` (`_updatedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_console_installations`
--

LOCK TABLES `_console_installations` WRITE;
/*!40000 ALTER TABLE `_console_installations` DISABLE KEYS */;
/*!40000 ALTER TABLE `_console_installations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_console_installations_perms`
--

DROP TABLE IF EXISTS `_console_installations_perms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_console_installations_perms` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_type` varchar(12) NOT NULL,
  `_permission` varchar(255) NOT NULL,
  `_document` varchar(255) NOT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_index1` (`_document`,`_type`,`_permission`),
  KEY `_permission` (`_permission`,`_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_console_installations_perms`
--

LOCK TABLES `_console_installations_perms` WRITE;
/*!40000 ALTER TABLE `_console_installations_perms` DISABLE KEYS */;
/*!40000 ALTER TABLE `_console_installations_perms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_console_keys`
--

DROP TABLE IF EXISTS `_console_keys`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_console_keys` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_uid` varchar(255) NOT NULL,
  `_createdAt` datetime(3) DEFAULT NULL,
  `_updatedAt` datetime(3) DEFAULT NULL,
  `_permissions` mediumtext DEFAULT NULL,
  `projectInternalId` varchar(255) DEFAULT NULL,
  `projectId` varchar(255) DEFAULT NULL,
  `name` varchar(255) DEFAULT NULL,
  `scopes` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`scopes`)),
  `secret` varchar(512) DEFAULT NULL,
  `expire` datetime(3) DEFAULT NULL,
  `accessedAt` datetime(3) DEFAULT NULL,
  `sdks` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`sdks`)),
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_uid` (`_uid`),
  KEY `_key_project` (`projectInternalId`),
  KEY `_key_accessedAt` (`accessedAt`),
  KEY `_created_at` (`_createdAt`),
  KEY `_updated_at` (`_updatedAt`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_console_keys`
--

LOCK TABLES `_console_keys` WRITE;
/*!40000 ALTER TABLE `_console_keys` DISABLE KEYS */;
INSERT INTO `_console_keys` VALUES
(1,'67dd2c12327a57b092e8','2025-03-21 09:06:26.206','2025-03-21 09:06:44.684','[\"read(\\\"any\\\")\",\"update(\\\"any\\\")\",\"delete(\\\"any\\\")\"]','2','rxdb-test-1','key','[\"sessions.write\",\"users.read\",\"users.write\",\"teams.read\",\"teams.write\",\"databases.read\",\"databases.write\",\"collections.read\",\"collections.write\",\"attributes.read\",\"attributes.write\",\"indexes.read\",\"indexes.write\",\"documents.read\",\"documents.write\",\"files.read\",\"files.write\",\"buckets.read\",\"buckets.write\",\"functions.read\",\"functions.write\",\"execution.read\",\"execution.write\",\"targets.read\",\"targets.write\",\"providers.read\",\"providers.write\",\"messages.read\",\"messages.write\",\"topics.read\",\"topics.write\",\"subscribers.read\",\"subscribers.write\",\"locale.read\",\"avatars.read\",\"health.read\",\"migrations.read\",\"migrations.write\"]','{\"data\":\"rY9KSsetTKXE44BWIIq0F6muDIYyJTPxoXCSCVfVmAC5oC2ij5y2nPkJeE4JtKeOz6RJtNyNYByTNoMnPmlSsx99yVBTQzd4UGd\\/dsRiDq0Z46eh8Wom8gc7ih8L84mnABKMr1NdaUqhwBj06V6fyM6Fvs5MTjO8C9Al3VqEDq+bskig49fXyDaUl4HBWOC\\/8ADq9YvRPniy7jc49tLh34OisSjrszu2zX\\/3a3q22vtAp5hd2MRLoMz6+EW493CRBpB0AnZ\\/giPE8B\\/RPiZoXMkIJlqqpQVur5M02gKrSmooArhX3Jw4zqKr88UBV8xij3hINUS7JtuqkXbRfczqlhlXMUbmzLYXmw==\",\"method\":\"aes-128-gcm\",\"iv\":\"bd7687b10886087010141536\",\"tag\":\"d9d61edf3d405b8d6f0f1fb9b0a1b07a\",\"version\":\"1\"}',NULL,'2025-03-21 09:06:44.684','[]');
/*!40000 ALTER TABLE `_console_keys` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_console_keys_perms`
--

DROP TABLE IF EXISTS `_console_keys_perms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_console_keys_perms` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_type` varchar(12) NOT NULL,
  `_permission` varchar(255) NOT NULL,
  `_document` varchar(255) NOT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_index1` (`_document`,`_type`,`_permission`),
  KEY `_permission` (`_permission`,`_type`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_console_keys_perms`
--

LOCK TABLES `_console_keys_perms` WRITE;
/*!40000 ALTER TABLE `_console_keys_perms` DISABLE KEYS */;
INSERT INTO `_console_keys_perms` VALUES
(3,'delete','any','67dd2c12327a57b092e8'),
(1,'read','any','67dd2c12327a57b092e8'),
(2,'update','any','67dd2c12327a57b092e8');
/*!40000 ALTER TABLE `_console_keys_perms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_console_memberships`
--

DROP TABLE IF EXISTS `_console_memberships`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_console_memberships` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_uid` varchar(255) NOT NULL,
  `_createdAt` datetime(3) DEFAULT NULL,
  `_updatedAt` datetime(3) DEFAULT NULL,
  `_permissions` mediumtext DEFAULT NULL,
  `userInternalId` varchar(255) DEFAULT NULL,
  `userId` varchar(255) DEFAULT NULL,
  `teamInternalId` varchar(255) DEFAULT NULL,
  `teamId` varchar(255) DEFAULT NULL,
  `roles` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`roles`)),
  `invited` datetime(3) DEFAULT NULL,
  `joined` datetime(3) DEFAULT NULL,
  `confirm` tinyint(1) DEFAULT NULL,
  `secret` varchar(256) DEFAULT NULL,
  `search` text DEFAULT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_uid` (`_uid`),
  UNIQUE KEY `_key_unique` (`teamInternalId`,`userInternalId`),
  KEY `_key_user` (`userInternalId`),
  KEY `_key_team` (`teamInternalId`),
  KEY `_key_userId` (`userId`),
  KEY `_key_teamId` (`teamId`),
  KEY `_key_invited` (`invited`),
  KEY `_key_joined` (`joined`),
  KEY `_key_confirm` (`confirm`),
  KEY `_created_at` (`_createdAt`),
  KEY `_updated_at` (`_updatedAt`),
  FULLTEXT KEY `_key_search` (`search`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_console_memberships`
--

LOCK TABLES `_console_memberships` WRITE;
/*!40000 ALTER TABLE `_console_memberships` DISABLE KEYS */;
INSERT INTO `_console_memberships` VALUES
(1,'67dc089084e5878868d4','2025-03-20 12:22:40.544','2025-03-20 12:22:40.544','[\"read(\\\"user:67dc088c00188f3ed87b\\\")\",\"read(\\\"team:67dc089000215613fd29\\\")\",\"update(\\\"user:67dc088c00188f3ed87b\\\")\",\"update(\\\"team:67dc089000215613fd29\\/owner\\\")\",\"delete(\\\"user:67dc088c00188f3ed87b\\\")\",\"delete(\\\"team:67dc089000215613fd29\\/owner\\\")\"]','1','67dc088c00188f3ed87b','1','67dc089000215613fd29','[\"owner\"]','2025-03-20 12:22:40.544','2025-03-20 12:22:40.544',1,'{\"data\":\"\",\"method\":\"aes-128-gcm\",\"iv\":\"f6ec757bde05172481e94e1d\",\"tag\":\"6e675d026a82d6f03f1467e44ca74b7a\",\"version\":\"1\"}','67dc089084e5878868d4 67dc088c00188f3ed87b');
/*!40000 ALTER TABLE `_console_memberships` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_console_memberships_perms`
--

DROP TABLE IF EXISTS `_console_memberships_perms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_console_memberships_perms` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_type` varchar(12) NOT NULL,
  `_permission` varchar(255) NOT NULL,
  `_document` varchar(255) NOT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_index1` (`_document`,`_type`,`_permission`),
  KEY `_permission` (`_permission`,`_type`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_console_memberships_perms`
--

LOCK TABLES `_console_memberships_perms` WRITE;
/*!40000 ALTER TABLE `_console_memberships_perms` DISABLE KEYS */;
INSERT INTO `_console_memberships_perms` VALUES
(6,'delete','team:67dc089000215613fd29/owner','67dc089084e5878868d4'),
(5,'delete','user:67dc088c00188f3ed87b','67dc089084e5878868d4'),
(2,'read','team:67dc089000215613fd29','67dc089084e5878868d4'),
(1,'read','user:67dc088c00188f3ed87b','67dc089084e5878868d4'),
(4,'update','team:67dc089000215613fd29/owner','67dc089084e5878868d4'),
(3,'update','user:67dc088c00188f3ed87b','67dc089084e5878868d4');
/*!40000 ALTER TABLE `_console_memberships_perms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_console_messages`
--

DROP TABLE IF EXISTS `_console_messages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_console_messages` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_uid` varchar(255) NOT NULL,
  `_createdAt` datetime(3) DEFAULT NULL,
  `_updatedAt` datetime(3) DEFAULT NULL,
  `_permissions` mediumtext DEFAULT NULL,
  `providerType` varchar(255) DEFAULT NULL,
  `status` varchar(255) DEFAULT NULL,
  `data` text DEFAULT NULL,
  `topics` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`topics`)),
  `users` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`users`)),
  `targets` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`targets`)),
  `scheduledAt` datetime(3) DEFAULT NULL,
  `scheduleInternalId` varchar(255) DEFAULT NULL,
  `scheduleId` varchar(255) DEFAULT NULL,
  `deliveredAt` datetime(3) DEFAULT NULL,
  `deliveryErrors` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`deliveryErrors`)),
  `deliveredTotal` int(11) DEFAULT NULL,
  `search` text DEFAULT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_uid` (`_uid`),
  KEY `_created_at` (`_createdAt`),
  KEY `_updated_at` (`_updatedAt`),
  FULLTEXT KEY `_key_search` (`search`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_console_messages`
--

LOCK TABLES `_console_messages` WRITE;
/*!40000 ALTER TABLE `_console_messages` DISABLE KEYS */;
/*!40000 ALTER TABLE `_console_messages` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_console_messages_perms`
--

DROP TABLE IF EXISTS `_console_messages_perms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_console_messages_perms` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_type` varchar(12) NOT NULL,
  `_permission` varchar(255) NOT NULL,
  `_document` varchar(255) NOT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_index1` (`_document`,`_type`,`_permission`),
  KEY `_permission` (`_permission`,`_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_console_messages_perms`
--

LOCK TABLES `_console_messages_perms` WRITE;
/*!40000 ALTER TABLE `_console_messages_perms` DISABLE KEYS */;
/*!40000 ALTER TABLE `_console_messages_perms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_console_platforms`
--

DROP TABLE IF EXISTS `_console_platforms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_console_platforms` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_uid` varchar(255) NOT NULL,
  `_createdAt` datetime(3) DEFAULT NULL,
  `_updatedAt` datetime(3) DEFAULT NULL,
  `_permissions` mediumtext DEFAULT NULL,
  `projectInternalId` varchar(255) DEFAULT NULL,
  `projectId` varchar(255) DEFAULT NULL,
  `type` varchar(255) DEFAULT NULL,
  `name` varchar(256) DEFAULT NULL,
  `key` varchar(255) DEFAULT NULL,
  `store` varchar(256) DEFAULT NULL,
  `hostname` varchar(256) DEFAULT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_uid` (`_uid`),
  KEY `_key_project` (`projectInternalId`),
  KEY `_created_at` (`_createdAt`),
  KEY `_updated_at` (`_updatedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_console_platforms`
--

LOCK TABLES `_console_platforms` WRITE;
/*!40000 ALTER TABLE `_console_platforms` DISABLE KEYS */;
/*!40000 ALTER TABLE `_console_platforms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_console_platforms_perms`
--

DROP TABLE IF EXISTS `_console_platforms_perms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_console_platforms_perms` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_type` varchar(12) NOT NULL,
  `_permission` varchar(255) NOT NULL,
  `_document` varchar(255) NOT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_index1` (`_document`,`_type`,`_permission`),
  KEY `_permission` (`_permission`,`_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_console_platforms_perms`
--

LOCK TABLES `_console_platforms_perms` WRITE;
/*!40000 ALTER TABLE `_console_platforms_perms` DISABLE KEYS */;
/*!40000 ALTER TABLE `_console_platforms_perms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_console_projects`
--

DROP TABLE IF EXISTS `_console_projects`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_console_projects` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_uid` varchar(255) NOT NULL,
  `_createdAt` datetime(3) DEFAULT NULL,
  `_updatedAt` datetime(3) DEFAULT NULL,
  `_permissions` mediumtext DEFAULT NULL,
  `teamInternalId` varchar(255) DEFAULT NULL,
  `teamId` varchar(255) DEFAULT NULL,
  `name` varchar(128) DEFAULT NULL,
  `region` varchar(128) DEFAULT NULL,
  `description` varchar(256) DEFAULT NULL,
  `database` varchar(256) DEFAULT NULL,
  `logo` varchar(255) DEFAULT NULL,
  `url` text DEFAULT NULL,
  `version` varchar(16) DEFAULT NULL,
  `legalName` varchar(256) DEFAULT NULL,
  `legalCountry` varchar(256) DEFAULT NULL,
  `legalState` varchar(256) DEFAULT NULL,
  `legalCity` varchar(256) DEFAULT NULL,
  `legalAddress` varchar(256) DEFAULT NULL,
  `legalTaxId` varchar(256) DEFAULT NULL,
  `accessedAt` datetime(3) DEFAULT NULL,
  `services` text DEFAULT NULL,
  `apis` text DEFAULT NULL,
  `smtp` text DEFAULT NULL,
  `templates` mediumtext DEFAULT NULL,
  `auths` text DEFAULT NULL,
  `oAuthProviders` text DEFAULT NULL,
  `platforms` text DEFAULT NULL,
  `webhooks` text DEFAULT NULL,
  `keys` text DEFAULT NULL,
  `search` text DEFAULT NULL,
  `pingCount` int(10) unsigned DEFAULT NULL,
  `pingedAt` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_uid` (`_uid`),
  KEY `_key_name` (`name`),
  KEY `_key_team` (`teamId`),
  KEY `_key_pingCount` (`pingCount`),
  KEY `_key_pingedAt` (`pingedAt`),
  KEY `_created_at` (`_createdAt`),
  KEY `_updated_at` (`_updatedAt`),
  FULLTEXT KEY `_key_search` (`search`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_console_projects`
--

LOCK TABLES `_console_projects` WRITE;
/*!40000 ALTER TABLE `_console_projects` DISABLE KEYS */;
INSERT INTO `_console_projects` VALUES
(2,'rxdb-test-1','2025-03-21 09:02:53.771','2025-03-21 09:02:53.771','[\"read(\\\"team:67dc089000215613fd29\\\")\",\"update(\\\"team:67dc089000215613fd29\\/owner\\\")\",\"update(\\\"team:67dc089000215613fd29\\/developer\\\")\",\"delete(\\\"team:67dc089000215613fd29\\/owner\\\")\",\"delete(\\\"team:67dc089000215613fd29\\/developer\\\")\"]','1','67dc089000215613fd29','rxdb-test-1','default','','database_db_main','','','1.6.1','','','','','','','2025-03-21 09:02:53.770','{}','[]','{\"data\":\"fRQ=\",\"method\":\"aes-128-gcm\",\"iv\":\"93e0f3165f8fca9b07c86778\",\"tag\":\"38afb72bca1559f200a17a4436b91386\",\"version\":\"1\"}','[]','{\"limit\":0,\"maxSessions\":10,\"passwordHistory\":0,\"passwordDictionary\":false,\"duration\":31536000,\"personalDataCheck\":false,\"mockNumbers\":[],\"sessionAlerts\":false,\"membershipsUserName\":false,\"membershipsUserEmail\":false,\"membershipsMfa\":false,\"emailPassword\":true,\"usersAuthMagicURL\":true,\"emailOtp\":true,\"anonymous\":true,\"invites\":true,\"JWT\":true,\"phone\":true}','{\"data\":\"gHw=\",\"method\":\"aes-128-gcm\",\"iv\":\"8afe8003a1512dba3e2fa9cb\",\"tag\":\"e0e4424e2c952ef114bd0fcc86117e87\",\"version\":\"1\"}',NULL,NULL,NULL,'rxdb-test-1 rxdb-test-1',0,NULL);
/*!40000 ALTER TABLE `_console_projects` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_console_projects_perms`
--

DROP TABLE IF EXISTS `_console_projects_perms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_console_projects_perms` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_type` varchar(12) NOT NULL,
  `_permission` varchar(255) NOT NULL,
  `_document` varchar(255) NOT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_index1` (`_document`,`_type`,`_permission`),
  KEY `_permission` (`_permission`,`_type`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_console_projects_perms`
--

LOCK TABLES `_console_projects_perms` WRITE;
/*!40000 ALTER TABLE `_console_projects_perms` DISABLE KEYS */;
INSERT INTO `_console_projects_perms` VALUES
(10,'delete','team:67dc089000215613fd29/developer','rxdb-test-1'),
(9,'delete','team:67dc089000215613fd29/owner','rxdb-test-1'),
(6,'read','team:67dc089000215613fd29','rxdb-test-1'),
(8,'update','team:67dc089000215613fd29/developer','rxdb-test-1'),
(7,'update','team:67dc089000215613fd29/owner','rxdb-test-1');
/*!40000 ALTER TABLE `_console_projects_perms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_console_providers`
--

DROP TABLE IF EXISTS `_console_providers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_console_providers` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_uid` varchar(255) NOT NULL,
  `_createdAt` datetime(3) DEFAULT NULL,
  `_updatedAt` datetime(3) DEFAULT NULL,
  `_permissions` mediumtext DEFAULT NULL,
  `name` varchar(128) DEFAULT NULL,
  `provider` varchar(255) DEFAULT NULL,
  `type` varchar(128) DEFAULT NULL,
  `enabled` tinyint(1) DEFAULT NULL,
  `credentials` text DEFAULT NULL,
  `options` text DEFAULT NULL,
  `search` text DEFAULT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_uid` (`_uid`),
  KEY `_key_provider` (`provider`),
  KEY `_key_type` (`type`),
  KEY `_key_enabled_type` (`enabled`,`type`),
  KEY `_created_at` (`_createdAt`),
  KEY `_updated_at` (`_updatedAt`),
  FULLTEXT KEY `_key_name` (`name`),
  FULLTEXT KEY `_key_search` (`search`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_console_providers`
--

LOCK TABLES `_console_providers` WRITE;
/*!40000 ALTER TABLE `_console_providers` DISABLE KEYS */;
/*!40000 ALTER TABLE `_console_providers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_console_providers_perms`
--

DROP TABLE IF EXISTS `_console_providers_perms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_console_providers_perms` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_type` varchar(12) NOT NULL,
  `_permission` varchar(255) NOT NULL,
  `_document` varchar(255) NOT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_index1` (`_document`,`_type`,`_permission`),
  KEY `_permission` (`_permission`,`_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_console_providers_perms`
--

LOCK TABLES `_console_providers_perms` WRITE;
/*!40000 ALTER TABLE `_console_providers_perms` DISABLE KEYS */;
/*!40000 ALTER TABLE `_console_providers_perms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_console_realtime`
--

DROP TABLE IF EXISTS `_console_realtime`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_console_realtime` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_uid` varchar(255) NOT NULL,
  `_createdAt` datetime(3) DEFAULT NULL,
  `_updatedAt` datetime(3) DEFAULT NULL,
  `_permissions` mediumtext DEFAULT NULL,
  `container` varchar(255) DEFAULT NULL,
  `timestamp` datetime(3) DEFAULT NULL,
  `value` text DEFAULT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_uid` (`_uid`),
  KEY `_key_timestamp` (`timestamp` DESC),
  KEY `_created_at` (`_createdAt`),
  KEY `_updated_at` (`_updatedAt`)
) ENGINE=InnoDB AUTO_INCREMENT=28 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_console_realtime`
--

LOCK TABLES `_console_realtime` WRITE;
/*!40000 ALTER TABLE `_console_realtime` DISABLE KEYS */;
INSERT INTO `_console_realtime` VALUES
(1,'67d2bd704197dc58e40c','2025-03-13 11:11:44.269','2025-03-13 11:11:44.269','[]','67d2bd673cc22','2025-03-13 11:11:44.268','{}'),
(2,'67d2c264d5dbb199b266','2025-03-13 11:32:52.878','2025-03-13 11:32:52.878','[]','67d2c25fd0826','2025-03-13 11:32:52.876','{}'),
(3,'67d348726ca944fa32c9','2025-03-13 21:04:50.446','2025-03-13 21:04:50.446','[]','67d3486d679ee','2025-03-13 21:04:50.445','{}'),
(4,'67d3cb895cf2e09abb00','2025-03-14 06:24:09.383','2025-03-14 06:24:09.383','[]','67d3cb8457ae1','2025-03-14 06:24:09.380','{}'),
(5,'67d488630f2522ff62b6','2025-03-14 19:49:55.064','2025-03-14 19:49:55.064','[]','67d4885e09f78','2025-03-14 19:49:55.062','{}'),
(6,'67d4a739a5bb32edd878','2025-03-14 22:01:29.680','2025-03-14 22:01:29.680','[]','67d4a734a1816','2025-03-14 22:01:29.678','{}'),
(7,'67d70e5059748addbb50','2025-03-16 17:45:52.368','2025-03-16 17:45:52.368','[]','67d70e4b55353','2025-03-16 17:45:52.366','{}'),
(8,'67d77b034fba6196ce5e','2025-03-17 01:29:39.329','2025-03-17 01:29:39.329','[]','67d77afe4904a','2025-03-17 01:29:39.326','{}'),
(9,'67d7e6d7c685f79e38c6','2025-03-17 09:09:43.815','2025-03-17 09:09:43.815','[]','67d7e6d2c0478','2025-03-17 09:09:43.813','{}'),
(10,'67d888d9cec973955e7e','2025-03-17 20:40:57.848','2025-03-17 20:40:57.848','[]','67d888d4ca9c0','2025-03-17 20:40:57.847','{}'),
(11,'67d941cfd39f7eaf991a','2025-03-18 09:50:07.868','2025-03-18 09:50:07.868','[]','67d941cacd82a','2025-03-18 09:50:07.866','{}'),
(12,'67d9882e7b4454933019','2025-03-18 14:50:22.508','2025-03-18 14:50:22.508','[]','67d988297501e','2025-03-18 14:50:22.505','{}'),
(13,'67d9cd3784ae81ab50cf','2025-03-18 19:44:55.546','2025-03-18 19:44:55.546','[]','67d9cd327fdf8','2025-03-18 19:44:55.543','{}'),
(14,'67d9f14e6a59fbb9c928','2025-03-18 22:18:54.437','2025-03-18 22:18:54.437','[]','67d9f14965082','2025-03-18 22:18:54.435','{}'),
(15,'67da64ed6b9827853289','2025-03-19 06:32:13.443','2025-03-19 06:32:13.443','[]','67da64e8652a4','2025-03-19 06:32:13.440','{}'),
(16,'67daa32c998dda217030','2025-03-19 10:57:48.630','2025-03-19 10:57:48.630','[]','67daa327954af','2025-03-19 10:57:48.629','{}'),
(17,'67db2e8f619a86f63a56','2025-03-19 20:52:31.401','2025-03-19 20:52:31.401','[]','67db2e8a5db3b','2025-03-19 20:52:31.399','{}'),
(18,'67dbd56fab993a920601','2025-03-20 08:44:31.704','2025-03-20 08:44:31.704','[]','67dbd56aa71e2','2025-03-20 08:44:31.703','{}'),
(19,'67dbf2f33e191365f81a','2025-03-20 10:50:27.256','2025-03-20 10:50:27.256','[]','67dbf2ee3a005','2025-03-20 10:50:27.254','{}'),
(20,'67dbf4597764ffb18893','2025-03-20 10:56:25.490','2025-03-20 10:56:25.490','[]','67dbf45472dca','2025-03-20 10:56:25.489','{}'),
(21,'67dbf479c511a862bb26','2025-03-20 10:56:57.808','2025-03-20 10:56:57.808','[]','67dbf474c0de5','2025-03-20 10:56:57.807','{}'),
(22,'67dc03cc9fb74a2ce7a6','2025-03-20 12:02:20.656','2025-03-20 12:02:20.656','[]','67dc03c79a7c3','2025-03-20 12:02:20.654','{}'),
(23,'67dc095b8fe55959bda7','2025-03-20 12:26:03.592','2025-03-20 17:12:38.587','[]','67dc09568b5f0','2025-03-20 17:12:38.586','{\"console\":1}'),
(24,'67dc78466ff9ccbd00cd','2025-03-20 20:19:18.462','2025-03-20 20:19:18.462','[]','67dc78416967c','2025-03-20 20:19:18.458','{}'),
(25,'67dd253b808054689fc7','2025-03-21 08:37:15.528','2025-03-21 08:37:15.528','[]','67dd25367a1c0','2025-03-21 08:37:15.526','{}'),
(26,'67dd297c08983d433590','2025-03-21 08:55:24.037','2025-03-21 09:01:34.034','[]','67dd297704994','2025-03-21 09:01:34.033','{\"console\":0}'),
(27,'67dd2afb18dd51b4503e','2025-03-21 09:01:47.104','2025-03-21 10:45:02.099','[]','67dd2af61410a','2025-03-21 10:45:02.098','{\"console\":1,\"rxdb-test-1\":0}');
/*!40000 ALTER TABLE `_console_realtime` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_console_realtime_perms`
--

DROP TABLE IF EXISTS `_console_realtime_perms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_console_realtime_perms` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_type` varchar(12) NOT NULL,
  `_permission` varchar(255) NOT NULL,
  `_document` varchar(255) NOT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_index1` (`_document`,`_type`,`_permission`),
  KEY `_permission` (`_permission`,`_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_console_realtime_perms`
--

LOCK TABLES `_console_realtime_perms` WRITE;
/*!40000 ALTER TABLE `_console_realtime_perms` DISABLE KEYS */;
/*!40000 ALTER TABLE `_console_realtime_perms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_console_repositories`
--

DROP TABLE IF EXISTS `_console_repositories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_console_repositories` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_uid` varchar(255) NOT NULL,
  `_createdAt` datetime(3) DEFAULT NULL,
  `_updatedAt` datetime(3) DEFAULT NULL,
  `_permissions` mediumtext DEFAULT NULL,
  `installationId` varchar(255) DEFAULT NULL,
  `installationInternalId` varchar(255) DEFAULT NULL,
  `projectId` varchar(255) DEFAULT NULL,
  `projectInternalId` varchar(255) DEFAULT NULL,
  `providerRepositoryId` varchar(255) DEFAULT NULL,
  `resourceId` varchar(255) DEFAULT NULL,
  `resourceInternalId` varchar(255) DEFAULT NULL,
  `resourceType` varchar(255) DEFAULT NULL,
  `providerPullRequestIds` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`providerPullRequestIds`)),
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_uid` (`_uid`),
  KEY `_key_installationId` (`installationId`),
  KEY `_key_installationInternalId` (`installationInternalId`),
  KEY `_key_projectInternalId` (`projectInternalId`),
  KEY `_key_projectId` (`projectId`),
  KEY `_key_providerRepositoryId` (`providerRepositoryId`),
  KEY `_key_resourceId` (`resourceId`),
  KEY `_key_resourceInternalId` (`resourceInternalId`),
  KEY `_key_resourceType` (`resourceType`),
  KEY `_created_at` (`_createdAt`),
  KEY `_updated_at` (`_updatedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_console_repositories`
--

LOCK TABLES `_console_repositories` WRITE;
/*!40000 ALTER TABLE `_console_repositories` DISABLE KEYS */;
/*!40000 ALTER TABLE `_console_repositories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_console_repositories_perms`
--

DROP TABLE IF EXISTS `_console_repositories_perms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_console_repositories_perms` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_type` varchar(12) NOT NULL,
  `_permission` varchar(255) NOT NULL,
  `_document` varchar(255) NOT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_index1` (`_document`,`_type`,`_permission`),
  KEY `_permission` (`_permission`,`_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_console_repositories_perms`
--

LOCK TABLES `_console_repositories_perms` WRITE;
/*!40000 ALTER TABLE `_console_repositories_perms` DISABLE KEYS */;
/*!40000 ALTER TABLE `_console_repositories_perms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_console_rules`
--

DROP TABLE IF EXISTS `_console_rules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_console_rules` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_uid` varchar(255) NOT NULL,
  `_createdAt` datetime(3) DEFAULT NULL,
  `_updatedAt` datetime(3) DEFAULT NULL,
  `_permissions` mediumtext DEFAULT NULL,
  `projectId` varchar(255) DEFAULT NULL,
  `projectInternalId` varchar(255) DEFAULT NULL,
  `domain` varchar(255) DEFAULT NULL,
  `resourceType` varchar(100) DEFAULT NULL,
  `resourceInternalId` varchar(255) DEFAULT NULL,
  `resourceId` varchar(255) DEFAULT NULL,
  `status` varchar(255) DEFAULT NULL,
  `certificateId` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_uid` (`_uid`),
  UNIQUE KEY `_key_domain` (`domain`),
  KEY `_key_projectInternalId` (`projectInternalId`),
  KEY `_key_projectId` (`projectId`),
  KEY `_key_resourceInternalId` (`resourceInternalId`),
  KEY `_key_resourceId` (`resourceId`),
  KEY `_key_resourceType` (`resourceType`),
  KEY `_created_at` (`_createdAt`),
  KEY `_updated_at` (`_updatedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_console_rules`
--

LOCK TABLES `_console_rules` WRITE;
/*!40000 ALTER TABLE `_console_rules` DISABLE KEYS */;
/*!40000 ALTER TABLE `_console_rules` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_console_rules_perms`
--

DROP TABLE IF EXISTS `_console_rules_perms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_console_rules_perms` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_type` varchar(12) NOT NULL,
  `_permission` varchar(255) NOT NULL,
  `_document` varchar(255) NOT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_index1` (`_document`,`_type`,`_permission`),
  KEY `_permission` (`_permission`,`_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_console_rules_perms`
--

LOCK TABLES `_console_rules_perms` WRITE;
/*!40000 ALTER TABLE `_console_rules_perms` DISABLE KEYS */;
/*!40000 ALTER TABLE `_console_rules_perms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_console_schedules`
--

DROP TABLE IF EXISTS `_console_schedules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_console_schedules` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_uid` varchar(255) NOT NULL,
  `_createdAt` datetime(3) DEFAULT NULL,
  `_updatedAt` datetime(3) DEFAULT NULL,
  `_permissions` mediumtext DEFAULT NULL,
  `resourceType` varchar(100) DEFAULT NULL,
  `resourceInternalId` varchar(255) DEFAULT NULL,
  `resourceId` varchar(255) DEFAULT NULL,
  `resourceUpdatedAt` datetime(3) DEFAULT NULL,
  `projectId` varchar(255) DEFAULT NULL,
  `schedule` varchar(100) DEFAULT NULL,
  `data` text DEFAULT NULL,
  `active` tinyint(1) DEFAULT NULL,
  `region` varchar(10) DEFAULT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_uid` (`_uid`),
  KEY `_key_region_resourceType_resourceUpdatedAt` (`region`,`resourceType`,`resourceUpdatedAt`),
  KEY `_key_region_resourceType_projectId_resourceId` (`region`,`resourceType`,`projectId`,`resourceId`),
  KEY `_created_at` (`_createdAt`),
  KEY `_updated_at` (`_updatedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_console_schedules`
--

LOCK TABLES `_console_schedules` WRITE;
/*!40000 ALTER TABLE `_console_schedules` DISABLE KEYS */;
/*!40000 ALTER TABLE `_console_schedules` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_console_schedules_perms`
--

DROP TABLE IF EXISTS `_console_schedules_perms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_console_schedules_perms` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_type` varchar(12) NOT NULL,
  `_permission` varchar(255) NOT NULL,
  `_document` varchar(255) NOT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_index1` (`_document`,`_type`,`_permission`),
  KEY `_permission` (`_permission`,`_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_console_schedules_perms`
--

LOCK TABLES `_console_schedules_perms` WRITE;
/*!40000 ALTER TABLE `_console_schedules_perms` DISABLE KEYS */;
/*!40000 ALTER TABLE `_console_schedules_perms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_console_sessions`
--

DROP TABLE IF EXISTS `_console_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_console_sessions` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_uid` varchar(255) NOT NULL,
  `_createdAt` datetime(3) DEFAULT NULL,
  `_updatedAt` datetime(3) DEFAULT NULL,
  `_permissions` mediumtext DEFAULT NULL,
  `userInternalId` varchar(255) DEFAULT NULL,
  `userId` varchar(255) DEFAULT NULL,
  `provider` varchar(128) DEFAULT NULL,
  `providerUid` varchar(2048) DEFAULT NULL,
  `providerAccessToken` text DEFAULT NULL,
  `providerAccessTokenExpiry` datetime(3) DEFAULT NULL,
  `providerRefreshToken` text DEFAULT NULL,
  `secret` varchar(512) DEFAULT NULL,
  `userAgent` text DEFAULT NULL,
  `ip` varchar(45) DEFAULT NULL,
  `countryCode` varchar(2) DEFAULT NULL,
  `osCode` varchar(256) DEFAULT NULL,
  `osName` varchar(256) DEFAULT NULL,
  `osVersion` varchar(256) DEFAULT NULL,
  `clientType` varchar(256) DEFAULT NULL,
  `clientCode` varchar(256) DEFAULT NULL,
  `clientName` varchar(256) DEFAULT NULL,
  `clientVersion` varchar(256) DEFAULT NULL,
  `clientEngine` varchar(256) DEFAULT NULL,
  `clientEngineVersion` varchar(256) DEFAULT NULL,
  `deviceName` varchar(256) DEFAULT NULL,
  `deviceBrand` varchar(256) DEFAULT NULL,
  `deviceModel` varchar(256) DEFAULT NULL,
  `factors` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`factors`)),
  `expire` datetime(3) DEFAULT NULL,
  `mfaUpdatedAt` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_uid` (`_uid`),
  KEY `_key_provider_providerUid` (`provider`,`providerUid`(128)),
  KEY `_key_user` (`userInternalId`),
  KEY `_created_at` (`_createdAt`),
  KEY `_updated_at` (`_updatedAt`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_console_sessions`
--

LOCK TABLES `_console_sessions` WRITE;
/*!40000 ALTER TABLE `_console_sessions` DISABLE KEYS */;
INSERT INTO `_console_sessions` VALUES
(1,'67dc088cc00a096b8bf0','2025-03-20 12:22:36.855','2025-03-20 12:22:36.855','[\"read(\\\"user:67dc088c00188f3ed87b\\\")\",\"update(\\\"user:67dc088c00188f3ed87b\\\")\",\"delete(\\\"user:67dc088c00188f3ed87b\\\")\"]','1','67dc088c00188f3ed87b','email','asdf@asdf.de',NULL,NULL,NULL,'{\"data\":\"W8Q9jWQXJsL3vNrjbQ6W7MzbmY2VBYjF\\/TOQHv+kRZAsRMevBfcOCGBphElp7D+BSW3JVHt64+xLepBwf7ZZsw==\",\"method\":\"aes-128-gcm\",\"iv\":\"4b1c656c2978cd2caf2e1111\",\"tag\":\"52503ed79e8564b2c8eda2648a676052\",\"version\":\"1\"}','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36','172.19.0.1','--','LIN','GNU/Linux','','browser','CH','Chrome','134.0','Blink','134.0.0.0','desktop',NULL,NULL,'[\"password\"]','2026-03-20 12:22:36.786',NULL);
/*!40000 ALTER TABLE `_console_sessions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_console_sessions_perms`
--

DROP TABLE IF EXISTS `_console_sessions_perms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_console_sessions_perms` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_type` varchar(12) NOT NULL,
  `_permission` varchar(255) NOT NULL,
  `_document` varchar(255) NOT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_index1` (`_document`,`_type`,`_permission`),
  KEY `_permission` (`_permission`,`_type`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_console_sessions_perms`
--

LOCK TABLES `_console_sessions_perms` WRITE;
/*!40000 ALTER TABLE `_console_sessions_perms` DISABLE KEYS */;
INSERT INTO `_console_sessions_perms` VALUES
(3,'delete','user:67dc088c00188f3ed87b','67dc088cc00a096b8bf0'),
(1,'read','user:67dc088c00188f3ed87b','67dc088cc00a096b8bf0'),
(2,'update','user:67dc088c00188f3ed87b','67dc088cc00a096b8bf0');
/*!40000 ALTER TABLE `_console_sessions_perms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_console_stats`
--

DROP TABLE IF EXISTS `_console_stats`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_console_stats` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_uid` varchar(255) NOT NULL,
  `_createdAt` datetime(3) DEFAULT NULL,
  `_updatedAt` datetime(3) DEFAULT NULL,
  `_permissions` mediumtext DEFAULT NULL,
  `metric` varchar(255) DEFAULT NULL,
  `region` varchar(255) DEFAULT NULL,
  `value` bigint(20) DEFAULT NULL,
  `time` datetime(3) DEFAULT NULL,
  `period` varchar(4) DEFAULT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_uid` (`_uid`),
  UNIQUE KEY `_key_metric_period_time` (`metric` DESC,`period`,`time`),
  KEY `_key_time` (`time` DESC),
  KEY `_key_period_time` (`period`,`time`),
  KEY `_created_at` (`_createdAt`),
  KEY `_updated_at` (`_updatedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_console_stats`
--

LOCK TABLES `_console_stats` WRITE;
/*!40000 ALTER TABLE `_console_stats` DISABLE KEYS */;
/*!40000 ALTER TABLE `_console_stats` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_console_stats_perms`
--

DROP TABLE IF EXISTS `_console_stats_perms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_console_stats_perms` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_type` varchar(12) NOT NULL,
  `_permission` varchar(255) NOT NULL,
  `_document` varchar(255) NOT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_index1` (`_document`,`_type`,`_permission`),
  KEY `_permission` (`_permission`,`_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_console_stats_perms`
--

LOCK TABLES `_console_stats_perms` WRITE;
/*!40000 ALTER TABLE `_console_stats_perms` DISABLE KEYS */;
/*!40000 ALTER TABLE `_console_stats_perms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_console_subscribers`
--

DROP TABLE IF EXISTS `_console_subscribers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_console_subscribers` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_uid` varchar(255) NOT NULL,
  `_createdAt` datetime(3) DEFAULT NULL,
  `_updatedAt` datetime(3) DEFAULT NULL,
  `_permissions` mediumtext DEFAULT NULL,
  `targetId` varchar(255) DEFAULT NULL,
  `targetInternalId` varchar(255) DEFAULT NULL,
  `userId` varchar(255) DEFAULT NULL,
  `userInternalId` varchar(255) DEFAULT NULL,
  `topicId` varchar(255) DEFAULT NULL,
  `topicInternalId` varchar(255) DEFAULT NULL,
  `providerType` varchar(128) DEFAULT NULL,
  `search` text DEFAULT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_uid` (`_uid`),
  UNIQUE KEY `_unique_target_topic` (`targetInternalId`,`topicInternalId`),
  KEY `_key_targetId` (`targetId`),
  KEY `_key_targetInternalId` (`targetInternalId`),
  KEY `_key_userId` (`userId`),
  KEY `_key_userInternalId` (`userInternalId`),
  KEY `_key_topicId` (`topicId`),
  KEY `_key_topicInternalId` (`topicInternalId`),
  KEY `_created_at` (`_createdAt`),
  KEY `_updated_at` (`_updatedAt`),
  FULLTEXT KEY `_fulltext_search` (`search`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_console_subscribers`
--

LOCK TABLES `_console_subscribers` WRITE;
/*!40000 ALTER TABLE `_console_subscribers` DISABLE KEYS */;
/*!40000 ALTER TABLE `_console_subscribers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_console_subscribers_perms`
--

DROP TABLE IF EXISTS `_console_subscribers_perms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_console_subscribers_perms` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_type` varchar(12) NOT NULL,
  `_permission` varchar(255) NOT NULL,
  `_document` varchar(255) NOT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_index1` (`_document`,`_type`,`_permission`),
  KEY `_permission` (`_permission`,`_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_console_subscribers_perms`
--

LOCK TABLES `_console_subscribers_perms` WRITE;
/*!40000 ALTER TABLE `_console_subscribers_perms` DISABLE KEYS */;
/*!40000 ALTER TABLE `_console_subscribers_perms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_console_targets`
--

DROP TABLE IF EXISTS `_console_targets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_console_targets` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_uid` varchar(255) NOT NULL,
  `_createdAt` datetime(3) DEFAULT NULL,
  `_updatedAt` datetime(3) DEFAULT NULL,
  `_permissions` mediumtext DEFAULT NULL,
  `userId` varchar(255) DEFAULT NULL,
  `userInternalId` varchar(255) DEFAULT NULL,
  `sessionId` varchar(255) DEFAULT NULL,
  `sessionInternalId` varchar(255) DEFAULT NULL,
  `providerType` varchar(255) DEFAULT NULL,
  `providerId` varchar(255) DEFAULT NULL,
  `providerInternalId` varchar(255) DEFAULT NULL,
  `identifier` varchar(255) DEFAULT NULL,
  `name` varchar(255) DEFAULT NULL,
  `expired` tinyint(1) DEFAULT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_uid` (`_uid`),
  UNIQUE KEY `_key_identifier` (`identifier`),
  KEY `_key_userId` (`userId`),
  KEY `_key_userInternalId` (`userInternalId`),
  KEY `_key_providerId` (`providerId`),
  KEY `_key_providerInternalId` (`providerInternalId`),
  KEY `_created_at` (`_createdAt`),
  KEY `_updated_at` (`_updatedAt`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_console_targets`
--

LOCK TABLES `_console_targets` WRITE;
/*!40000 ALTER TABLE `_console_targets` DISABLE KEYS */;
INSERT INTO `_console_targets` VALUES
(1,'67dc088c94eae6938ae5','2025-03-20 12:22:36.609','2025-03-20 12:22:36.609','[\"read(\\\"user:67dc088c00188f3ed87b\\\")\",\"update(\\\"user:67dc088c00188f3ed87b\\\")\",\"delete(\\\"user:67dc088c00188f3ed87b\\\")\"]','67dc088c00188f3ed87b','1',NULL,NULL,'email',NULL,NULL,'asdf@asdf.de',NULL,0);
/*!40000 ALTER TABLE `_console_targets` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_console_targets_perms`
--

DROP TABLE IF EXISTS `_console_targets_perms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_console_targets_perms` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_type` varchar(12) NOT NULL,
  `_permission` varchar(255) NOT NULL,
  `_document` varchar(255) NOT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_index1` (`_document`,`_type`,`_permission`),
  KEY `_permission` (`_permission`,`_type`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_console_targets_perms`
--

LOCK TABLES `_console_targets_perms` WRITE;
/*!40000 ALTER TABLE `_console_targets_perms` DISABLE KEYS */;
INSERT INTO `_console_targets_perms` VALUES
(3,'delete','user:67dc088c00188f3ed87b','67dc088c94eae6938ae5'),
(1,'read','user:67dc088c00188f3ed87b','67dc088c94eae6938ae5'),
(2,'update','user:67dc088c00188f3ed87b','67dc088c94eae6938ae5');
/*!40000 ALTER TABLE `_console_targets_perms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_console_teams`
--

DROP TABLE IF EXISTS `_console_teams`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_console_teams` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_uid` varchar(255) NOT NULL,
  `_createdAt` datetime(3) DEFAULT NULL,
  `_updatedAt` datetime(3) DEFAULT NULL,
  `_permissions` mediumtext DEFAULT NULL,
  `name` varchar(128) DEFAULT NULL,
  `total` int(11) DEFAULT NULL,
  `search` text DEFAULT NULL,
  `prefs` text DEFAULT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_uid` (`_uid`),
  KEY `_key_name` (`name`),
  KEY `_key_total` (`total`),
  KEY `_created_at` (`_createdAt`),
  KEY `_updated_at` (`_updatedAt`),
  FULLTEXT KEY `_key_search` (`search`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_console_teams`
--

LOCK TABLES `_console_teams` WRITE;
/*!40000 ALTER TABLE `_console_teams` DISABLE KEYS */;
INSERT INTO `_console_teams` VALUES
(1,'67dc089000215613fd29','2025-03-20 12:22:40.540','2025-03-20 12:22:40.540','[\"read(\\\"team:67dc089000215613fd29\\\")\",\"update(\\\"team:67dc089000215613fd29\\/owner\\\")\",\"delete(\\\"team:67dc089000215613fd29\\/owner\\\")\"]','asdf',1,'67dc089000215613fd29 asdf','{}');
/*!40000 ALTER TABLE `_console_teams` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_console_teams_perms`
--

DROP TABLE IF EXISTS `_console_teams_perms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_console_teams_perms` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_type` varchar(12) NOT NULL,
  `_permission` varchar(255) NOT NULL,
  `_document` varchar(255) NOT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_index1` (`_document`,`_type`,`_permission`),
  KEY `_permission` (`_permission`,`_type`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_console_teams_perms`
--

LOCK TABLES `_console_teams_perms` WRITE;
/*!40000 ALTER TABLE `_console_teams_perms` DISABLE KEYS */;
INSERT INTO `_console_teams_perms` VALUES
(3,'delete','team:67dc089000215613fd29/owner','67dc089000215613fd29'),
(1,'read','team:67dc089000215613fd29','67dc089000215613fd29'),
(2,'update','team:67dc089000215613fd29/owner','67dc089000215613fd29');
/*!40000 ALTER TABLE `_console_teams_perms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_console_tokens`
--

DROP TABLE IF EXISTS `_console_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_console_tokens` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_uid` varchar(255) NOT NULL,
  `_createdAt` datetime(3) DEFAULT NULL,
  `_updatedAt` datetime(3) DEFAULT NULL,
  `_permissions` mediumtext DEFAULT NULL,
  `userInternalId` varchar(255) DEFAULT NULL,
  `userId` varchar(255) DEFAULT NULL,
  `type` int(11) DEFAULT NULL,
  `secret` varchar(512) DEFAULT NULL,
  `expire` datetime(3) DEFAULT NULL,
  `userAgent` text DEFAULT NULL,
  `ip` varchar(45) DEFAULT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_uid` (`_uid`),
  KEY `_key_user` (`userInternalId`),
  KEY `_created_at` (`_createdAt`),
  KEY `_updated_at` (`_updatedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_console_tokens`
--

LOCK TABLES `_console_tokens` WRITE;
/*!40000 ALTER TABLE `_console_tokens` DISABLE KEYS */;
/*!40000 ALTER TABLE `_console_tokens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_console_tokens_perms`
--

DROP TABLE IF EXISTS `_console_tokens_perms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_console_tokens_perms` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_type` varchar(12) NOT NULL,
  `_permission` varchar(255) NOT NULL,
  `_document` varchar(255) NOT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_index1` (`_document`,`_type`,`_permission`),
  KEY `_permission` (`_permission`,`_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_console_tokens_perms`
--

LOCK TABLES `_console_tokens_perms` WRITE;
/*!40000 ALTER TABLE `_console_tokens_perms` DISABLE KEYS */;
/*!40000 ALTER TABLE `_console_tokens_perms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_console_topics`
--

DROP TABLE IF EXISTS `_console_topics`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_console_topics` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_uid` varchar(255) NOT NULL,
  `_createdAt` datetime(3) DEFAULT NULL,
  `_updatedAt` datetime(3) DEFAULT NULL,
  `_permissions` mediumtext DEFAULT NULL,
  `name` varchar(128) DEFAULT NULL,
  `subscribe` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`subscribe`)),
  `emailTotal` int(11) DEFAULT NULL,
  `smsTotal` int(11) DEFAULT NULL,
  `pushTotal` int(11) DEFAULT NULL,
  `targets` text DEFAULT NULL,
  `search` text DEFAULT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_uid` (`_uid`),
  KEY `_created_at` (`_createdAt`),
  KEY `_updated_at` (`_updatedAt`),
  FULLTEXT KEY `_key_name` (`name`),
  FULLTEXT KEY `_key_search` (`search`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_console_topics`
--

LOCK TABLES `_console_topics` WRITE;
/*!40000 ALTER TABLE `_console_topics` DISABLE KEYS */;
/*!40000 ALTER TABLE `_console_topics` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_console_topics_perms`
--

DROP TABLE IF EXISTS `_console_topics_perms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_console_topics_perms` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_type` varchar(12) NOT NULL,
  `_permission` varchar(255) NOT NULL,
  `_document` varchar(255) NOT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_index1` (`_document`,`_type`,`_permission`),
  KEY `_permission` (`_permission`,`_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_console_topics_perms`
--

LOCK TABLES `_console_topics_perms` WRITE;
/*!40000 ALTER TABLE `_console_topics_perms` DISABLE KEYS */;
/*!40000 ALTER TABLE `_console_topics_perms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_console_users`
--

DROP TABLE IF EXISTS `_console_users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_console_users` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_uid` varchar(255) NOT NULL,
  `_createdAt` datetime(3) DEFAULT NULL,
  `_updatedAt` datetime(3) DEFAULT NULL,
  `_permissions` mediumtext DEFAULT NULL,
  `name` varchar(256) DEFAULT NULL,
  `email` varchar(320) DEFAULT NULL,
  `phone` varchar(16) DEFAULT NULL,
  `status` tinyint(1) DEFAULT NULL,
  `labels` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`labels`)),
  `passwordHistory` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`passwordHistory`)),
  `password` text DEFAULT NULL,
  `hash` varchar(256) DEFAULT NULL,
  `hashOptions` text DEFAULT NULL,
  `passwordUpdate` datetime(3) DEFAULT NULL,
  `prefs` text DEFAULT NULL,
  `registration` datetime(3) DEFAULT NULL,
  `emailVerification` tinyint(1) DEFAULT NULL,
  `phoneVerification` tinyint(1) DEFAULT NULL,
  `reset` tinyint(1) DEFAULT NULL,
  `mfa` tinyint(1) DEFAULT NULL,
  `mfaRecoveryCodes` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`mfaRecoveryCodes`)),
  `authenticators` text DEFAULT NULL,
  `sessions` text DEFAULT NULL,
  `tokens` text DEFAULT NULL,
  `challenges` text DEFAULT NULL,
  `memberships` text DEFAULT NULL,
  `targets` text DEFAULT NULL,
  `search` text DEFAULT NULL,
  `accessedAt` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_uid` (`_uid`),
  UNIQUE KEY `_key_phone` (`phone`),
  UNIQUE KEY `_key_email` (`email`(256)),
  KEY `_key_name` (`name`),
  KEY `_key_status` (`status`),
  KEY `_key_passwordUpdate` (`passwordUpdate`),
  KEY `_key_registration` (`registration`),
  KEY `_key_emailVerification` (`emailVerification`),
  KEY `_key_phoneVerification` (`phoneVerification`),
  KEY `_key_accessedAt` (`accessedAt`),
  KEY `_created_at` (`_createdAt`),
  KEY `_updated_at` (`_updatedAt`),
  FULLTEXT KEY `_key_search` (`search`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_console_users`
--

LOCK TABLES `_console_users` WRITE;
/*!40000 ALTER TABLE `_console_users` DISABLE KEYS */;
INSERT INTO `_console_users` VALUES
(1,'67dc088c00188f3ed87b','2025-03-20 12:22:36.584','2025-03-20 16:34:51.793','[\"read(\\\"any\\\")\",\"update(\\\"user:67dc088c00188f3ed87b\\\")\",\"delete(\\\"user:67dc088c00188f3ed87b\\\")\"]','asdf','asdf@asdf.de',NULL,1,'[]','[]','{\"data\":\"m7ifJPBcuwNm5MafCQiEx\\/IDk9c3aQotb+u8gtoKjoR5gffCh+mMX7UW6sAlx7yPtHPIrnFutkhKr8iekBG7XbVzYPjY3SYCR8Gbq7aDDXL4R4tJQ\\/oXX8r+nPTUXP1kjQ==\",\"method\":\"aes-128-gcm\",\"iv\":\"5b679219189c1e1b21cc14ea\",\"tag\":\"942cc3136c7fcc139a7ef44e4c32af62\",\"version\":\"1\"}','argon2','{\"type\":\"argon2\",\"memoryCost\":2048,\"timeCost\":4,\"threads\":3}','2025-03-20 12:22:36.583','{\"organization\":\"67dc089000215613fd29\"}','2025-03-20 12:22:36.583',0,NULL,0,0,'[]',NULL,NULL,NULL,NULL,NULL,NULL,'67dc088c00188f3ed87b asdf@asdf.de asdf','2025-03-20 12:22:36.583');
/*!40000 ALTER TABLE `_console_users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_console_users_perms`
--

DROP TABLE IF EXISTS `_console_users_perms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_console_users_perms` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_type` varchar(12) NOT NULL,
  `_permission` varchar(255) NOT NULL,
  `_document` varchar(255) NOT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_index1` (`_document`,`_type`,`_permission`),
  KEY `_permission` (`_permission`,`_type`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_console_users_perms`
--

LOCK TABLES `_console_users_perms` WRITE;
/*!40000 ALTER TABLE `_console_users_perms` DISABLE KEYS */;
INSERT INTO `_console_users_perms` VALUES
(3,'delete','user:67dc088c00188f3ed87b','67dc088c00188f3ed87b'),
(1,'read','any','67dc088c00188f3ed87b'),
(2,'update','user:67dc088c00188f3ed87b','67dc088c00188f3ed87b');
/*!40000 ALTER TABLE `_console_users_perms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_console_vcsCommentLocks`
--

DROP TABLE IF EXISTS `_console_vcsCommentLocks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_console_vcsCommentLocks` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_uid` varchar(255) NOT NULL,
  `_createdAt` datetime(3) DEFAULT NULL,
  `_updatedAt` datetime(3) DEFAULT NULL,
  `_permissions` mediumtext DEFAULT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_uid` (`_uid`),
  KEY `_created_at` (`_createdAt`),
  KEY `_updated_at` (`_updatedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_console_vcsCommentLocks`
--

LOCK TABLES `_console_vcsCommentLocks` WRITE;
/*!40000 ALTER TABLE `_console_vcsCommentLocks` DISABLE KEYS */;
/*!40000 ALTER TABLE `_console_vcsCommentLocks` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_console_vcsCommentLocks_perms`
--

DROP TABLE IF EXISTS `_console_vcsCommentLocks_perms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_console_vcsCommentLocks_perms` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_type` varchar(12) NOT NULL,
  `_permission` varchar(255) NOT NULL,
  `_document` varchar(255) NOT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_index1` (`_document`,`_type`,`_permission`),
  KEY `_permission` (`_permission`,`_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_console_vcsCommentLocks_perms`
--

LOCK TABLES `_console_vcsCommentLocks_perms` WRITE;
/*!40000 ALTER TABLE `_console_vcsCommentLocks_perms` DISABLE KEYS */;
/*!40000 ALTER TABLE `_console_vcsCommentLocks_perms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_console_vcsComments`
--

DROP TABLE IF EXISTS `_console_vcsComments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_console_vcsComments` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_uid` varchar(255) NOT NULL,
  `_createdAt` datetime(3) DEFAULT NULL,
  `_updatedAt` datetime(3) DEFAULT NULL,
  `_permissions` mediumtext DEFAULT NULL,
  `installationId` varchar(255) DEFAULT NULL,
  `installationInternalId` varchar(255) DEFAULT NULL,
  `projectId` varchar(255) DEFAULT NULL,
  `projectInternalId` varchar(255) DEFAULT NULL,
  `providerRepositoryId` varchar(255) DEFAULT NULL,
  `providerCommentId` varchar(255) DEFAULT NULL,
  `providerPullRequestId` varchar(255) DEFAULT NULL,
  `providerBranch` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_uid` (`_uid`),
  KEY `_key_installationId` (`installationId`),
  KEY `_key_installationInternalId` (`installationInternalId`),
  KEY `_key_projectInternalId` (`projectInternalId`),
  KEY `_key_projectId` (`projectId`),
  KEY `_key_providerRepositoryId` (`providerRepositoryId`),
  KEY `_key_providerPullRequestId` (`providerPullRequestId`),
  KEY `_key_providerBranch` (`providerBranch`),
  KEY `_created_at` (`_createdAt`),
  KEY `_updated_at` (`_updatedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_console_vcsComments`
--

LOCK TABLES `_console_vcsComments` WRITE;
/*!40000 ALTER TABLE `_console_vcsComments` DISABLE KEYS */;
/*!40000 ALTER TABLE `_console_vcsComments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_console_vcsComments_perms`
--

DROP TABLE IF EXISTS `_console_vcsComments_perms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_console_vcsComments_perms` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_type` varchar(12) NOT NULL,
  `_permission` varchar(255) NOT NULL,
  `_document` varchar(255) NOT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_index1` (`_document`,`_type`,`_permission`),
  KEY `_permission` (`_permission`,`_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_console_vcsComments_perms`
--

LOCK TABLES `_console_vcsComments_perms` WRITE;
/*!40000 ALTER TABLE `_console_vcsComments_perms` DISABLE KEYS */;
/*!40000 ALTER TABLE `_console_vcsComments_perms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_console_webhooks`
--

DROP TABLE IF EXISTS `_console_webhooks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_console_webhooks` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_uid` varchar(255) NOT NULL,
  `_createdAt` datetime(3) DEFAULT NULL,
  `_updatedAt` datetime(3) DEFAULT NULL,
  `_permissions` mediumtext DEFAULT NULL,
  `projectInternalId` varchar(255) DEFAULT NULL,
  `projectId` varchar(255) DEFAULT NULL,
  `name` varchar(255) DEFAULT NULL,
  `url` varchar(255) DEFAULT NULL,
  `httpUser` varchar(255) DEFAULT NULL,
  `httpPass` varchar(255) DEFAULT NULL,
  `security` tinyint(1) DEFAULT NULL,
  `events` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`events`)),
  `signatureKey` varchar(2048) DEFAULT NULL,
  `enabled` tinyint(1) DEFAULT NULL,
  `logs` mediumtext DEFAULT NULL,
  `attempts` int(11) DEFAULT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_uid` (`_uid`),
  KEY `_key_project` (`projectInternalId`),
  KEY `_created_at` (`_createdAt`),
  KEY `_updated_at` (`_updatedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_console_webhooks`
--

LOCK TABLES `_console_webhooks` WRITE;
/*!40000 ALTER TABLE `_console_webhooks` DISABLE KEYS */;
/*!40000 ALTER TABLE `_console_webhooks` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_console_webhooks_perms`
--

DROP TABLE IF EXISTS `_console_webhooks_perms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_console_webhooks_perms` (
  `_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `_type` varchar(12) NOT NULL,
  `_permission` varchar(255) NOT NULL,
  `_document` varchar(255) NOT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `_index1` (`_document`,`_type`,`_permission`),
  KEY `_permission` (`_permission`,`_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_console_webhooks_perms`
--

LOCK TABLES `_console_webhooks_perms` WRITE;
/*!40000 ALTER TABLE `_console_webhooks_perms` DISABLE KEYS */;
/*!40000 ALTER TABLE `_console_webhooks_perms` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-03-21 10:45:06
