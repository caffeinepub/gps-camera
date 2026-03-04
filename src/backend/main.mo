import Map "mo:core/Map";
import Text "mo:core/Text";
import Runtime "mo:core/Runtime";
import Array "mo:core/Array";
import Time "mo:core/Time";
import Iter "mo:core/Iter";
import MixinStorage "blob-storage/Mixin";
import Storage "blob-storage/Storage";

actor {
  include MixinStorage();

  let photoMap = Map.empty<Text, Photo>();

  type Photo = {
    id : Text;
    latitude : Float;
    longitude : Float;
    timestamp : Time.Time;
    note : ?Text;
    image : Storage.ExternalBlob;
  };

  public shared ({ caller }) func addPhoto(id : Text, latitude : Float, longitude : Float, note : ?Text, image : Storage.ExternalBlob) : async () {
    let photo = {
      id;
      latitude;
      longitude;
      timestamp = Time.now();
      note;
      image;
    };
    photoMap.add(id, photo);
  };

  public query ({ caller }) func getAllPhotos() : async [Photo] {
    photoMap.values().toArray();
  };

  public shared ({ caller }) func deletePhoto(id : Text) : async () {
    switch (photoMap.get(id)) {
      case (null) { Runtime.trap("Photo not found") };
      case (?_) {
        photoMap.remove(id);
      };
    };
  };

  public shared ({ caller }) func getPhoto(id : Text) : async Photo {
    switch (photoMap.get(id)) {
      case (null) { Runtime.trap("Photo not found") };
      case (?photo) { photo };
    };
  };

  public query ({ caller }) func getPhotosInRange(minLat : Float, maxLat : Float, minLong : Float, maxLong : Float) : async [Photo] {
    let iter = photoMap.values().filter(
      func(photo) {
        photo.latitude >= minLat and photo.latitude <= maxLat and photo.longitude >= minLong and photo.longitude <= maxLong
      }
    );
    iter.toArray();
  };

};
