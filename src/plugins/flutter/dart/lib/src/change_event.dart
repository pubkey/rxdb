/// A change of a document, see https://rxdb.info/rx-collection.html#observe-
class RxChangeEvent {
  /// One of INSERT, UPDATE or DELETE.
  final String operation;
  final String documentId;
  final String? collectionName;
  final bool isLocal;
  final Map<String, dynamic>? documentData;
  final Map<String, dynamic>? previousDocumentData;

  RxChangeEvent({
    required this.operation,
    required this.documentId,
    required this.collectionName,
    required this.isLocal,
    required this.documentData,
    required this.previousDocumentData,
  });

  factory RxChangeEvent.fromJson(dynamic json) {
    final map = Map<String, dynamic>.from(json as Map);
    return RxChangeEvent(
      operation: map['operation'] as String,
      documentId: map['documentId'] as String,
      collectionName: map['collectionName'] as String?,
      isLocal: map['isLocal'] == true,
      documentData: map['documentData'] == null ? null : Map<String, dynamic>.from(map['documentData'] as Map),
      previousDocumentData: map['previousDocumentData'] == null
          ? null
          : Map<String, dynamic>.from(map['previousDocumentData'] as Map),
    );
  }

  @override
  String toString() => 'RxChangeEvent($operation $collectionName/$documentId)';
}
